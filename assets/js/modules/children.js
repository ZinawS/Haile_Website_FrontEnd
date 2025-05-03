/**
 * Children Form Handler - Manages the children registration form
 * 
 * Responsibilities:
 * - Auto-detects user's country
 * - Handles form submission
 * - Manages form state and validation
 * - Integrates with API and payment systems
 * - Provides user feedback
 * 
 * Dependencies:
 * - api.js (registerChild)
 * - payment.js (PaymentHandler)
 * - showModal.js (user notifications)
 */

import { registerChild } from "./api.js";
import { PaymentHandler } from "./payment.js";
import showModal from "./showModal.js";

// Configuration constants
const FORM_CONFIG = {
  countryDetectionEndpoint: "https://ipapi.co/json/",
  defaultCountryFallback: "United States",
  formResetDelay: 1500 // ms after success before reset
};

// State management
let formState = {
  isSubmitting: false,
  paymentHandler: null
};

/**
 * Detects user's country and sets it as default in the form
 * @param {HTMLSelectElement} countrySelect - Country dropdown element
 */
async function detectAndSetDefaultCountry(countrySelect) {
  if (!countrySelect) return;

  try {
    const response = await fetch(FORM_CONFIG.countryDetectionEndpoint, {
      signal: AbortSignal.timeout(3000) // Timeout after 3 seconds
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const geoData = await response.json();
    const userCountry = geoData.country_name || FORM_CONFIG.defaultCountryFallback;

    // Set country if found in options
    const countryOption = Array.from(countrySelect.options).find(
      opt => opt.value === userCountry
    );

    if (countryOption) {
      countrySelect.value = userCountry;
      $(countrySelect).trigger("change"); // Update Select2 if present
    }
  } catch (error) {
    console.warn("Country detection failed:", error.message);
    // Fallback to default country
    const fallbackOption = Array.from(countrySelect.options).find(
      opt => opt.value === FORM_CONFIG.defaultCountryFallback
    );
    if (fallbackOption) {
      countrySelect.value = FORM_CONFIG.defaultCountryFallback;
      $(countrySelect).trigger("change");
    }
  }
}

/**
 * Validates form data before submission
 * @param {object} formData - Form data to validate
 * @returns {boolean} True if valid
 */
function validateFormData(formData) {
  // Required fields validation
  const requiredFields = [
    'child_name', 
    'father_name',
    'mother_name',
    'country',
    'class_date',
    'time_slot',
    'email',
    'phone'
  ];

  for (const field of requiredFields) {
    if (!formData[field] || formData[field].trim() === '') {
      showModal(`Please fill in the ${field.replace('_', ' ')} field`);
      return false;
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    showModal("Please enter a valid email address");
    return false;
  }

  return true;
}

/**
 * Handles form submission
 * @param {Event} e - Form submit event
 * @param {HTMLFormElement} form - The form element
 */
async function handleFormSubmit(e, form) {
  e.preventDefault();
  e.stopPropagation();

  // Prevent duplicate submissions
  if (formState.isSubmitting) return;
  formState.isSubmitting = true;

  // Get form elements
  const countrySelect = document.getElementById("country");
  const stateSelect = document.getElementById("state");

  // Prepare form data
  const formData = {
    child_name: form.child_name.value.trim(),
    father_name: form.father_name.value.trim(),
    mother_name: form.mother_name.value.trim(),
    country: countrySelect.value,
    state: stateSelect?.value || null,
    class_date: form.class_date.value,
    time_slot: form.time_slot.value,
    start_time_utc: form.start_time_utc.value,
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    church: form.church.value?.trim() || null
  };

  // Validate form data
  if (!validateFormData(formData)) {
    formState.isSubmitting = false;
    return;
  }

  try {
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    // Submit to API
    const result = await registerChild(formData);

    // Show success
    showModal(result.message || "Registration successful!", "success");

    // Reset form after delay
    setTimeout(() => {
      form.reset();
      [countrySelect, stateSelect].forEach(select => {
        if (select) $(select).val(null).trigger("change");
      });
      
      // Re-enable button
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      // Initialize payment handler if needed
      if (!formState.paymentHandler) {
        formState.paymentHandler = new PaymentHandler(formData.email);
      }
    }, FORM_CONFIG.resetDelay);

  } catch (error) {
    console.error("Registration error:", error);
    showModal(
      error.message || "Registration failed. Please try again later.",
      "error"
    );
  } finally {
    formState.isSubmitting = false;
  }
}

/**
 * Initializes the children registration form
 */
export function setupChildrenForm() {
  const childrenForm = document.getElementById("children-form");
  const countrySelect = document.getElementById("country");

  if (!childrenForm) {
    console.warn("Children form element not found");
    return;
  }

  // Auto-detect and set country
  detectAndSetDefaultCountry(countrySelect);

  // Set up form submission
  childrenForm.addEventListener("submit", (e) => handleFormSubmit(e, childrenForm));
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  try {
    setupChildrenForm();
  } catch (error) {
    console.error("Failed to initialize children form:", error);
    showModal("Form initialization failed. Please refresh the page.", "error");
  }
});