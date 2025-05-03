/**
 * Stripe Payment Handler
 *
 * Production-ready payment processing frontend with:
 * - Complete Stripe Elements integration
 * - Robust error handling
 * - Comprehensive form validation
 * - Idempotent payment processing
 * - Responsive UI feedback
 *
 * Key Features:
 * - Secure card element integration
 * - Multi-form donation handling
 * - Payment state management
 * - Graceful error recovery
 * - Accessibility considerations
 *
 * Requirements:
 * - Stripe.js loaded in global scope
 * - Configuration object in window.config:
 *   - STRIPE_PUBLISHABLE_KEY
 *   - API_BASE_URL
 * - DOM elements:
 *   - donation-form
 *   - close-form
 *   - pay-button
 *   - user-email
 *   - payment-amount
 *   - user-name
 *   - stripe-card-element
 *   - notificationModal (optional)
 */

export class PaymentHandler {
  constructor() {
    // Validate critical configuration
    if (
      !window.config?.STRIPE_PUBLISHABLE_KEY ||
      !window.config?.API_BASE_URL
    ) {
      this.showFatalError("Payment configuration incomplete");
      throw new Error("Missing Stripe publishable key or API base URL");
    }

    // Initialize payment state
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
    this.paymentInProgress = false;
    this.idempotencyKey = null;
    this.currentSource = "main_button";
    this.initializationError = null;
    this.debounceTimeout = null;
    this.isButtonBound = false;

    // Setup payment system with error handling
    try {
      this.initializeStripe();
      this.setupDonationForms();
    } catch (error) {
      console.error("Payment initialization error:", error);
      this.showFatalError("Payment system initialization failed");
      this.initializationError = error;
    }
  }

  initializeStripe() {
    try {
      this.stripe = Stripe(window.config.STRIPE_PUBLISHABLE_KEY, {
        apiVersion: "2023-10-16",
      });
    } catch (error) {
      console.error("Stripe initialization failed:", error);
      this.showFatalError("Payment processor unavailable");
      throw error;
    }
  }

  setupDonationForms() {
    const formsConfig = [
      { buttonId: "donate-button", source: "main_button" },
      { buttonId: "donate-button2", source: "form_footer" },
    ];

    const donationForm = document.getElementById("donation-form");
    const closeButton = document.getElementById("close-form");
    const payButton = document.getElementById("pay-button");

    if (!donationForm || !closeButton || !payButton) {
      console.error("Missing required donation form elements");
      this.showFatalError("Payment form configuration error");
      return;
    }

    const showDonationForm = (source) => {
      if (this.initializationError) {
        this.showFatalError("Payment system unavailable");
        return;
      }

      this.currentSource = source;
      donationForm.style.display = "block";
      document.body.style.overflow = "hidden";
      this.clearPaymentElement();

      if (!this.elementsMounted) {
        this.initializeCardElements().catch((error) => {
          console.error("Card element initialization failed:", error);
          this.showNotification(
            "Payment form error. Please refresh the page.",
            "error"
          );
        });
      }
    };

    formsConfig.forEach(({ buttonId, source }) => {
      const button = document.getElementById(buttonId);
      button?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showDonationForm(source);
      });
    });

    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      donationForm.style.display = "none";
      document.body.style.overflow = "";
      this.clearPaymentElement();
    });

    if (!this.isButtonBound) {
      payButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePaymentClick(e);
      });
      this.isButtonBound = true;
    }

    this.setupDraggableForm();
  }

  setupDraggableForm() {
    const donationForm = document.getElementById("donation-form");
    const dragHeader = document.getElementById("drag-header");

    if (!donationForm || !dragHeader) {
      console.warn("Draggable form elements not found");
      return;
    }

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    dragHeader.style.cursor = "move";

    dragHeader.addEventListener("mousedown", (e) => {
      isDragging = true;
      const rect = donationForm.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      donationForm.style.position = "fixed";
      donationForm.style.left = e.clientX - offsetX + "px";
      donationForm.style.top = e.clientY - offsetY + "px";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  clearPaymentElement() {
    try {
      const container = document.getElementById("stripe-card-element");
      if (container) {
        container.innerHTML = "";
      }
      this.cardElement = null;
      this.elementsMounted = false;
    } catch (error) {
      console.error("Error clearing payment element:", error);
    }
  }

  async handlePaymentClick(e) {
    if (this.paymentInProgress) {
      e.preventDefault();
      e.stopPropagation();
      this.showNotification("Payment already in progress", "info");
      return;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      const payButton = document.getElementById("pay-button");
      payButton.disabled = true;
      payButton.style.opacity = "0.6";
      payButton.style.cursor = "not-allowed";

      try {
        await this.handlePaymentSubmission();
      } catch (error) {
        console.error("Payment processing error:", error);
        let userMessage = "Payment failed. Please try again.";
        if (error.code === "card_declined") {
          userMessage = "Card declined. Please try another payment method.";
        } else if (error.code === "expired_card") {
          userMessage = "Card expired. Please use a different card.";
        }
        this.showNotification(userMessage, "error");
      } finally {
        payButton.disabled = false;
        payButton.style.opacity = "1";
        payButton.style.cursor = "pointer";
        this.debounceTimeout = null;
      }
    }, 500);
  }

  validateInputs(amount, email, name) {
    // Name validation (optional, defaults to "Anonymous")
    if (name && name.length > 255) {
      this.showNotification("Name must be 255 characters or less", "error");
      return false;
    }

    // Email validation
    if (!email) {
      this.showNotification("Email address is required", "error");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showNotification("Please enter a valid email address", "error");
      return false;
    }

    // Amount validation
    if (isNaN(amount)) {
      this.showNotification("Please enter a valid number", "error");
      return false;
    }
    if (amount <= 0) {
      this.showNotification("Amount must be greater than zero", "error");
      return false;
    }
    if (amount > 10000) {
      this.showNotification("Maximum donation amount is $10,000", "error");
      return false;
    }

    return true;
  }

  async handlePaymentSubmission() {
    if (this.paymentInProgress) return;
    this.paymentInProgress = true;

    try {
      const emailInput = document.getElementById("user-email");
      const amountInput = document.getElementById("payment-amount");
      const nameInput = document.getElementById("user-name");

      if (!emailInput || !amountInput || !nameInput) {
        throw new Error("Missing required form fields");
      }

      const amount = parseFloat(amountInput.value);
      const email = emailInput.value.trim();
      const name = nameInput.value.trim() || "Anonymous";

      if (!this.validateInputs(amount, email, name)) {
        return;
      }

      this.idempotencyKey = crypto.randomUUID();
      this.showNotification("Processing payment...", "info");

      let response;
      try {
        response = await fetch(
          `${window.config.API_BASE_URL}/api/payments/intents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": this.idempotencyKey,
            },
            body: JSON.stringify({
              amount: Math.round(amount * 100),
              currency: "usd",
              email: email,
              name: name,
              receipt_email: email,
              metadata: {
                source: "website",
                donation_source: this.currentSource,
                browser: navigator.userAgent,
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
              },
            }),
          }
        );
      } catch (networkError) {
        throw new Error("Network error. Please check your connection.");
      }

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Invalid payment details");
        }
        if (response.status === 404) {
          throw new Error(
            "Payment endpoint not found. Please contact support."
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Payment processing failed");
      }

      const { clientSecret, contributionId } = await response.json();
      this.contributionId = contributionId;
      await this.processStripePayment(clientSecret, email, name);
    } catch (error) {
      console.error("Payment submission error:", error);
      this.showNotification(
        error.message || "Payment failed. Please try again.",
        "error"
      );
      throw error;
    } finally {
      this.paymentInProgress = false;
    }
  }

  async processStripePayment(clientSecret, email, name) {
    this.clientSecret = clientSecret;

    try {
      if (!this.elementsMounted) {
        await this.initializeCardElements();
      }

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: this.cardElement,
            billing_details: {
              email: email,
              name: name,
            },
          },
          setup_future_usage: "off_session",
        }
      );

      if (error) {
        throw error;
      }

      switch (paymentIntent?.status) {
        case "requires_capture":
          this.showNotification(
            "Payment authorized! Capturing funds...",
            "info"
          );
          await this.handleManualCapture(paymentIntent.id);
          break;

        case "succeeded":
          this.showNotification("Payment succeeded!", "success");
          setTimeout(() => {
            const queryParams = new URLSearchParams({
              payment_intent: paymentIntent.id,
              contribution_id: this.contributionId || "",
            });
            window.location.href = `${window.location.origin}/frontEnd/success.html?${queryParams.toString()}`;
          }, 1500);
          break;

        default:
          this.showNotification(
            `Payment status: ${paymentIntent?.status}`,
            "info"
          );
      }
    } catch (error) {
      console.error("Stripe payment error:", error.message);
      this.showNotification(
        this.getUserFriendlyError(error) || "Payment failed. Please try again.",
        "error"
      );
      throw error;
    }
  }

  async handleManualCapture(paymentIntentId) {
    try {
      this.showNotification("Finalizing payment...", "info");

      const response = await fetch(
        `${window.config.API_BASE_URL}/api/payments/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to capture payment");
      }

      this.showNotification("Payment completed successfully!", "success");
      setTimeout(() => {
        const queryParams = new URLSearchParams({
          payment_intent: paymentIntentId,
          contribution_id: this.contributionId || "",
        });
        window.location.href = `${window.location.origin}/frontEnd/success.html?${queryParams.toString()}`;
      }, 1500);
    } catch (error) {
      console.error("Capture error:", error);

      let errorMessage = "Payment processing failed";
      if (error.message.includes("already captured")) {
        errorMessage = "Payment was already processed";
      } else if (error.message.includes("expired")) {
        errorMessage = "Payment authorization expired";
      }

      this.showNotification(errorMessage, "error");
    }
  }

  getUserFriendlyError(error) {
    if (error.code === "payment_intent_authentication_failure") {
      return "Payment authentication failed. Please try again.";
    }
    if (error.code === "card_declined") {
      return "Your card was declined. Please try another payment method.";
    }
    if (error.type === "StripeCardError") {
      return "Card error. Please check your details and try again.";
    }
    return null;
  }

  async initializeCardElements() {
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    this.clearPaymentElement();
    try {
      this.elements = this.stripe.elements({
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#1d4ed8",
            colorBackground: "#ffffff",
            colorText: "#111827",
            colorDanger: "#dc2626",
            fontFamily: "'Inter', sans-serif",
            spacingUnit: "8px",
            borderRadius: "10px",
          },
          rules: {
            ".Input": {
              padding: "16px",
              borderColor: "#d1d5db",
              color: "#111827",
              fontSize: "18px",
            },
            ".Input:focus": {
              borderColor: "#1d4ed8",
            },
          },
        },
      });

      let cardElementContainer = document.getElementById("stripe-card-element");
      if (!cardElementContainer) {
        cardElementContainer = document.createElement("div");
        cardElementContainer.id = "stripe-card-element";
        cardElementContainer.style.margin = "24px 0";
        cardElementContainer.style.padding = "12px";
        cardElementContainer.style.border = "1px solid #e5e7eb";
        cardElementContainer.style.borderRadius = "10px";
        cardElementContainer.style.backgroundColor = "#f9fafb";

        const amountInput = document.getElementById("payment-amount");
        amountInput?.insertAdjacentElement("afterend", cardElementContainer);
      }

      this.cardElement = this.elements.create("card", {
        style: {
          base: {
            fontSize: "18px",
            color: "#111827",
            fontFamily: "'Inter', sans-serif",
            "::placeholder": {
              color: "#6b7280",
            },
            iconColor: "#1d4ed8",
            backgroundColor: "#f9fafb",
            padding: "16px",
          },
          invalid: {
            color: "#dc2626",
            iconColor: "#dc2626",
          },
        },
      });

      this.cardElement.mount("#stripe-card-element");
      this.elementsMounted = true;
    } catch (error) {
      console.error("Card element initialization failed:", error);
      this.showNotification(
        "Payment form error. Please refresh the page.",
        "error"
      );
      throw error;
    }
  }

  showNotification(message, type = "info") {
    console.log(`[${type}] ${message}`);

    const modal = document.getElementById("notificationModal");
    const modalMessage = document.getElementById("modalMessage");
    if (!modal || !modalMessage) {
      return;
    }

    modalMessage.textContent = message;
    modal.style.display = "block";
    modalMessage.className = type;

    const closeBtn = document.getElementById("modalCloseBtn");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = "none";
      };
    }

    if (type === "info") {
      setTimeout(() => {
        modal.style.display = "none";
      }, 5000);
    }
  }

  showFatalError(message = "Payment system unavailable") {
    console.error("Fatal payment error:", message);

    let errorDiv = document.getElementById("payment-error-banner");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.id = "payment-error-banner";
      errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff4444;
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 9999;
      `;
      document.body.prepend(errorDiv);
    }

    errorDiv.textContent = message;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (!window.paymentHandler) {
        window.paymentHandler = new PaymentHandler();
      }
    } catch (error) {
      console.error("Payment initialization failed:", error);
    }
  });
} else {
  if (!window.paymentHandler) {
    window.paymentHandler = new PaymentHandler();
  }
}
