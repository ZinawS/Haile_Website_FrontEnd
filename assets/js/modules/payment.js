/* ==========================================================================
   Stripe Payment Handler
   Production-ready frontend for processing payments with Stripe Elements,
   featuring robust error handling, form validation, idempotent payments,
   and responsive UI feedback.
   ========================================================================== */
   let paymentSuccessUrl= `${window.location.origin}/Haile_Website_FrontEnd/success.html?`;

export class PaymentHandler {
  /* ==========================================================================
     Configuration
     Defines Stripe and API settings for payment processing.
     ========================================================================== */
  static PAYMENT_CONFIG = {
    stripeApiVersion: "2023-10-16",
    apiBaseUrl: window.config?.API_BASE_URL || "http://localhost:3000",
    stripePublishableKey: window.config?.STRIPE_PUBLISHABLE_KEY,
    debounceDelay: 500,
    maxAmount: 10000,
    maxNameLength: 255,
    notificationTimeout: 5000,
    
  };
  // PAYMENT_CONFIG.paymentSuccessUrl
  /* ==========================================================================
     Constructor
     Initializes payment state, validates configuration, and sets up Stripe.
     ========================================================================== */
  constructor() {
    // Validate critical configuration
    if (
      !PaymentHandler.PAYMENT_CONFIG.stripePublishableKey ||
      !PaymentHandler.PAYMENT_CONFIG.apiBaseUrl
    ) {
      this.handleError("Payment configuration incomplete", true);
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
    this.elementsMounted = false;

    // Cache DOM elements
    this.domElements = {
      donationForm: document.getElementById("donation-form"),
      closeButton: document.getElementById("close-form"),
      payButton: document.getElementById("pay-button"),
      cardContainer: document.getElementById("stripe-card-element"),
      emailInput: document.getElementById("user-email"),
      amountInput: document.getElementById("payment-amount"),
      nameInput: document.getElementById("user-name"),
      notificationModal: document.getElementById("notificationModal"),
      modalMessage: document.getElementById("modalMessage"),
      modalCloseBtn: document.getElementById("modalCloseBtn"),
      dragHeader: document.getElementById("drag-header"),
    };

    // Setup payment system
    try {
      this.initializeStripe();
      this.setupDonationForms();
    } catch (error) {
      this.handleError("Payment system initialization failed", true, error);
      this.initializationError = error;
    }
  }

  /* ==========================================================================
     Stripe Initialization
     Sets up the Stripe instance with the publishable key.
     ========================================================================== */
  initializeStripe() {
    try {
      this.stripe = Stripe(PaymentHandler.PAYMENT_CONFIG.stripePublishableKey, {
        apiVersion: PaymentHandler.PAYMENT_CONFIG.stripeApiVersion,
      });
    } catch (error) {
      this.handleError("Payment processor unavailable", true, error);
      throw error;
    }
  }

  /* ==========================================================================
     Donation Form Setup
     Configures donation form buttons, close behavior, and event listeners.
     ========================================================================== */
  setupDonationForms() {
    const { donationForm, closeButton, payButton } = this.domElements;

    if (!donationForm || !closeButton || !payButton) {
      this.handleError("Payment form configuration error", true);
      return;
    }

    const formsConfig = [
      { buttonId: "donate-button", source: "main_button" },
      { buttonId: "donate-button2", source: "form_footer" },
    ];

    const showDonationForm = (source) => {
      if (this.initializationError) {
        this.showNotification("Payment system unavailable", "error");
        return;
      }

      this.currentSource = source;
      donationForm.style.display = "block";
      document.body.style.overflow = "hidden";
      this.clearPaymentElement();

      if (!this.elementsMounted) {
        this.initializeCardElements().catch((error) => {
          this.handleError("Card element initialization failed", false, error);
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

    payButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePaymentClick(e);
    });

    this.setupDraggableForm();
  }

  /* ==========================================================================
     Draggable Form Setup
     Enables dragging of the donation form via the header.
     ========================================================================== */
  setupDraggableForm() {
    const { donationForm, dragHeader } = this.domElements;

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
      donationForm.style.left = `${e.clientX - offsetX}px`;
      donationForm.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  /* ==========================================================================
     Payment Element Management
     Clears and initializes the Stripe card element.
     ========================================================================== */
  clearPaymentElement() {
    try {
      const { cardContainer } = this.domElements;
      if (cardContainer) {
        cardContainer.innerHTML = "";
      }
      this.cardElement = null;
      this.elementsMounted = false;
    } catch (error) {
      this.handleError("Error clearing payment element", false, error);
    }
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

      let { cardContainer } = this.domElements;
      if (!cardContainer) {
        cardContainer = document.createElement("div");
        cardContainer.id = "stripe-card-element";
        cardContainer.style.margin = "24px 0";
        cardContainer.style.padding = "12px";
        cardContainer.style.border = "1px solid #e5e7eb";
        cardContainer.style.borderRadius = "10px";
        cardContainer.style.backgroundColor = "#f9fafb";

        const { amountInput } = this.domElements;
        amountInput?.insertAdjacentElement("afterend", cardContainer);
        this.domElements.cardContainer = cardContainer;
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
      this.handleError("Card element initialization failed", false, error);
      throw error;
    }
  }

  /* ==========================================================================
     Payment Processing
     Handles payment submission, validation, and Stripe confirmation.
     ========================================================================== */
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
      const { payButton } = this.domElements;
      payButton.disabled = true;
      payButton.style.opacity = "0.6";
      payButton.style.cursor = "not-allowed";

      try {
        await this.handlePaymentSubmission();
      } catch (error) {
        const userMessage =
          this.getUserFriendlyError(error) ||
          "Payment failed. Please try again.";
        this.showNotification(userMessage, "error");
      } finally {
        payButton.disabled = false;
        payButton.style.opacity = "1";
        payButton.style.cursor = "pointer";
        this.debounceTimeout = null;
      }
    }, PaymentHandler.PAYMENT_CONFIG.debounceDelay);
  }

  async handlePaymentSubmission() {
    if (this.paymentInProgress) return;
    this.paymentInProgress = true;

    try {
      const { emailInput, amountInput, nameInput } = this.domElements;

      // Validate DOM elements
      if (!emailInput || !amountInput || !nameInput) {
        const missingFields = [
          !emailInput && "Email field",
          !amountInput && "Amount field",
          !nameInput && "Name field",
        ].filter(Boolean);
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Sanitize and validate inputs
      const amount = parseFloat(amountInput.value || 0);
      const email = this.sanitizeInput(emailInput.value || "");
      const name = this.sanitizeInput(nameInput.value || "Anonymous");

      if (!this.validateInputs(amount, email, name)) {
        return;
      }

      this.idempotencyKey = crypto.randomUUID();
      this.showNotification("Processing payment...", "info");

      let response;
      try {
        response = await fetch(
          `${PaymentHandler.PAYMENT_CONFIG.apiBaseUrl}/api/payments/intents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": this.idempotencyKey,
            },
            body: JSON.stringify({
              amount: Math.round(amount * 100),
              currency: "usd",
              email,
              name,
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
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400) {
          throw new Error(errorData.error || "Invalid payment details");
        }
        if (response.status === 404) {
          throw new Error(
            "Payment endpoint not found. Please contact support."
          );
        }
        throw new Error(errorData.error || "Payment processing failed");
      }

      const { clientSecret, contributionId } = await response.json();
      this.contributionId = contributionId;
      await this.processStripePayment(clientSecret, email, name);
    } catch (error) {
      this.handleError("Payment submission error", false, error);
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
            billing_details: { email, name },
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
            window.location.href = `${paymentSuccessUrl}${queryParams.toString()}`;
          }, 1500);
          break;

        default:
          this.showNotification(
            `Payment status: ${paymentIntent?.status}`,
            "info"
          );
      }
    } catch (error) {
      this.handleError("Stripe payment error", false, error);
      throw error;
    }
  }

  async handleManualCapture(paymentIntentId) {
    try {
      this.showNotification("Finalizing payment...", "info");

      const response = await fetch(
        `${PaymentHandler.PAYMENT_CONFIG.apiBaseUrl}/api/payments/capture`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
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
        window.location.href = `${paymentSuccessUrl}${queryParams.toString()}`;
      }, 1500);
    } catch (error) {
      let errorMessage = "Payment processing failed";
      if (error.message.includes("already captured")) {
        errorMessage = "Payment was already processed";
      } else if (error.message.includes("expired")) {
        errorMessage = "Payment authorization expired";
      }
      this.handleError("Capture error", false, error);
      this.showNotification(errorMessage, "error");
    }
  }

  /* ==========================================================================
     Input Validation and Sanitization
     Validates and sanitizes user inputs for payment processing.
     ========================================================================== */
  validateInputs(amount, email, name) {
    // Name validation
    if (name.length > PaymentHandler.PAYMENT_CONFIG.maxNameLength) {
      this.showNotification(
        `Name must be ${PaymentHandler.PAYMENT_CONFIG.maxNameLength} characters or less`,
        "error"
      );
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
    if (amount > PaymentHandler.PAYMENT_CONFIG.maxAmount) {
      this.showNotification(
        `Maximum donation amount is $${PaymentHandler.PAYMENT_CONFIG.maxAmount}`,
        "error"
      );
      return false;
    }

    return true;
  }

  sanitizeInput(input) {
    return input
      .replace(
        /[<>&'"]/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            "'": "&#39;",
            '"': "&quot;",
          })[char]
      )
      .trim();
  }

  /* ==========================================================================
     Error Handling and Notifications
     Displays user-friendly notifications and logs errors.
     ========================================================================== */
  handleError(message, isFatal = false, error = null) {
    console.error(`[${isFatal ? "Fatal" : "Error"}] ${message}`, error || "");
    if (isFatal) {
      this.showFatalError(message);
    }
  }

  getUserFriendlyError(error) {
    if (error.code === "payment_intent_authentication_failure") {
      return "Payment authentication failed. Please try again.";
    }
    if (error.code === "card_declined") {
      return "Your card was declined. Please try another payment method.";
    }
    if (error.code === "expired_card") {
      return "Card expired. Please use a different card.";
    }
    if (error.type === "StripeCardError") {
      return "Card error. Please check your details and try again.";
    }
    return null;
  }

  showNotification(message, type = "info") {
    console.log(`[${type}] ${message}`);

    const { notificationModal, modalMessage, modalCloseBtn } = this.domElements;
    if (!notificationModal || !modalMessage) {
      console.warn("Notification modal elements not found");
      return;
    }

    modalMessage.textContent = message;
    modalMessage.className = type;
    notificationModal.style.display = "block";

    if (modalCloseBtn) {
      modalCloseBtn.onclick = () => {
        notificationModal.style.display = "none";
      };
    }

    if (type === "info") {
      setTimeout(() => {
        notificationModal.style.display = "none";
      }, PaymentHandler.PAYMENT_CONFIG.notificationTimeout);
    }
  }

  showFatalError(message = "Payment system unavailable") {
    this.handleError(message, true);

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

/* ==========================================================================
   Module Initialization
   Initializes the PaymentHandler instance on DOM load.
   ========================================================================== */
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
