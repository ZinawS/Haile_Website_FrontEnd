/**
 * Contact Form Handler - Manages the contact form submission and validation
 *
 * Features:
 * - Form validation with user feedback
 * - Submission state management
 * - Error handling with user notifications
 * - Accessibility improvements
 * - Loading state during submission
 *
 * Dependencies:
 * - api.js (submitContactForm)
 * - showModal.js (user notifications)
 */

import { submitContactForm } from "./api.js";
import showModal from "./showModal.js";

// Configuration constants
const FORM_CONFIG = {
  minNameLength: 2,
  maxNameLength: 100,
  maxMessageLength: 1000,
  submissionDebounce: 2000, // Prevent rapid resubmissions
};

// Track form state
let formState = {
  isSubmitting: false,
  lastSubmission: 0,
};

/**
 * Validates contact form data
 * @param {object} formData - Form data to validate
 * @returns {object} Validation result { isValid: boolean, message?: string }
 */
function validateContactForm(formData) {
  // Validate name
  if (
    !formData.name ||
    formData.name.trim().length < FORM_CONFIG.minNameLength
  ) {
    return {
      isValid: false,
      message: `Name must be at least ${FORM_CONFIG.minNameLength} characters`,
    };
  }

  if (formData.name.length > FORM_CONFIG.maxNameLength) {
    return {
      isValid: false,
      message: `Name must be less than ${FORM_CONFIG.maxNameLength} characters`,
    };
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }

  // Validate subject
  if (!formData.subject) {
    return { isValid: false, message: "Please select a subject" };
  }

  // Validate message
  if (!formData.message || formData.message.trim().length < 10) {
    return {
      isValid: false,
      message: "Message must be at least 10 characters",
    };
  }

  if (formData.message.length > FORM_CONFIG.maxMessageLength) {
    return {
      isValid: false,
      message: `Message must be less than ${FORM_CONFIG.maxMessageLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Handles form submission
 * @param {Event} event - Form submit event
 * @param {HTMLFormElement} form - The form element
 */
async function handleFormSubmit(event, form) {
  event.preventDefault();

  // Prevent rapid resubmissions
  const now = Date.now();
  if (
    formState.isSubmitting ||
    now - formState.lastSubmission < FORM_CONFIG.submissionDebounce
  ) {
    return;
  }

  formState.isSubmitting = true;
  formState.lastSubmission = now;

  // Get form elements
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerHTML;

  // Show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <span class="spinner" aria-hidden="true"></span>
    Sending...
  `;

  // Prepare form data
  const formData = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    subject: form.subject.value,
    message: form.message.value.trim(),
  };

  // Validate form data
  const validation = validateContactForm(formData);
  if (!validation.isValid) {
    showModal(validation.message, "error");
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
    formState.isSubmitting = false;
    return;
  }

  try {
    // Submit form data
    await submitContactForm(formData);

    // Show success and reset form
    showModal("Thank you for reaching out!  Your message is important to us. Please allow a few days for a response while we prepare personalized support for you.", "success");
    form.reset();

    // Log conversion (analytics)
    if (window.gtag) {
      gtag("event", "contact_form_submitted");
    }
  } catch (error) {
    console.error("Form submission error:", error);

    let errorMessage = "Failed to send message. Please try again later.";
    if (
      error.message &&
      error.message.toLowerCase().includes("network error")
    ) {
      errorMessage =
        "Network error. Please check your connection and try again.";
    }

    showModal(errorMessage, "error");
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
    formState.isSubmitting = false;
  }
}

/**
 * Initializes the contact form with event listeners
 */
export function setupContactForm() {
  const contactForm = document.getElementById("contact-form");

  if (!contactForm) {
    console.warn("Contact form element not found");
    return;
  }

  // Set up form submission
  contactForm.addEventListener("submit", (event) =>
    handleFormSubmit(event, contactForm)
  );

  // Improve accessibility
  contactForm.querySelectorAll("input, textarea, select").forEach((input) => {
    input.addEventListener("focus", () => {
      input.setAttribute("aria-describedby", "form-instructions");
    });
  });
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    setupContactForm();
  } catch (error) {
    console.error("Failed to initialize contact form:", error);
    showModal("Form initialization failed. Please refresh the page.", "error");
  }
});
