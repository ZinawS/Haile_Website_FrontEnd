// import FormManager from "./modules/forms.js";
// import { setupNavigation } from "./modules/navigation.js";
// import { setupContactForm } from "./modules/email.js";
// import { fetchYouTubeVideos } from "./modules/video.js";

// import { PaymentHandler } from "./modules/payment.js";

// document.addEventListener("DOMContentLoaded", () => {
//   const payment = new PaymentHandler();

//   document.getElementById("pay-button").addEventListener("click", () => {
//     const email = document.getElementById("user-email").value;
//     const amount = document.getElementById("payment-amount").value;
//     payment.startPayment(amount, email);
//   });
// });

// // Initialize payment handler
// const payment = new PaymentHandler({
//   modalId: "payment-modal",
//   formId: "payment-form",
//   elementId: "payment-element",
//   submitId: "submit-payment",
//   messageId: "payment-message",
// });

// document.addEventListener("DOMContentLoaded", () => {
//   // Initialize all modules
//   setupNavigation();
//   new FormManager();
//   setupContactForm();
//   fetchYouTubeVideos();
//   new PaymentHandler();

//   // Initialize payment button if exists
//   const payButton = document.getElementById("pay-button");
//   if (payButton) {
//     payButton.addEventListener("click", (e) => {
//       e.preventDefault();
//       const email =
//         document.getElementById("user-email")?.value || "user@example.com";
//       const amount = document.getElementById("payment-amount")?.value || 10; // Default $10.00
//       payment.startPayment(email, amount);
//     });
//   }

//   // Check for payment status on success page
//   if (window.location.pathname.includes("/payment-success")) {
//     const paymentIntentId = new URLSearchParams(window.location.search).get(
//       "payment_intent"
//     );
//     if (paymentIntentId) {
//       payment.showSuccess("Payment completed successfully!");
//       // You can add additional success handling here
//     }
//   }

//   // Initialize global event listeners
//   setupGlobalEventListeners();
// });

// function setupGlobalEventListeners() {
//   // Close modals when clicking outside
//   document.addEventListener("click", (e) => {
//     const modals = document.querySelectorAll(".modal, #payment-modal");
//     modals.forEach((modal) => {
//       if (e.target === modal) {
//         modal.classList.remove("visible");
//       }
//     });
//   });

//   // Close modals with Escape key
//   document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape") {
//       document.querySelectorAll(".modal, #payment-modal").forEach((modal) => {
//         modal.classList.remove("visible");
//       });
//     }
//   });

//   // Initialize tooltips
//   const tooltipElements = document.querySelectorAll("[data-tooltip]");
//   tooltipElements.forEach((el) => {
//     el.addEventListener("mouseenter", showTooltip);
//     el.addEventListener("mouseleave", hideTooltip);
//   });
// }

// function showTooltip(e) {
//   const tooltipText = this.getAttribute("data-tooltip");
//   const tooltip = document.createElement("div");
//   tooltip.className = "tooltip";
//   tooltip.textContent = tooltipText;

//   document.body.appendChild(tooltip);

//   const rect = this.getBoundingClientRect();
//   tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
//   tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
// }

// function hideTooltip() {
//   const tooltip = document.querySelector(".tooltip");
//   if (tooltip) {
//     tooltip.remove();
//   }
// }

// // Export for potential module usage
// export function initializeApp() {
//   document.dispatchEvent(new Event("DOMContentLoaded"));
// }
