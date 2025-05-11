/* ==========================================================================
   API Service Module
   Handles all API communications with configurable base URL, retry logic, 
   timeout handling, and consistent error management.
   ========================================================================== */

/* ==========================================================================
   Configuration
   Defines the base URL, timeout, retry settings, and other API constants.
   ========================================================================== */
const API_CONFIG = {
  baseUrl: window.config?.API_BASE_URL || "http://localhost:3000",
  defaultTimeout: 8000, // 8 seconds
  maxRetries: 2,
  retryDelay: 1000, // 1 second
};

/* ==========================================================================
   Core Request Handler
   Makes API requests with retry logic, timeout, and AbortController support.
   ========================================================================== */
/**
 * Makes an API request with enhanced error handling and retry logic
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @param {number} [timeout] - Request timeout in ms
 * @returns {Promise<object>} API response data
 * @throws {Error} On network errors or failed responses
 */
async function _makeRequest(
  endpoint,
  options = {},
  timeout = API_CONFIG.defaultTimeout
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let attempt = 0;
  let lastError = null;

  while (attempt <= API_CONFIG.maxRetries) {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await _parseErrorResponse(response);
        throw new ApiError(
          errorData.message || "Request failed",
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      attempt++;

      // Don't retry if it's an abort error or client error (4xx)
      if (
        error.name === "AbortError" ||
        (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
      ) {
        break;
      }

      if (attempt <= API_CONFIG.maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.retryDelay)
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

/* ==========================================================================
   Error Response Parser
   Parses error responses from the API for consistent error handling.
   ========================================================================== */
/**
 * Parses error response from API
 * @param {Response} response - Fetch response object
 * @returns {Promise<object>} Parsed error data
 */
async function _parseErrorResponse(response) {
  try {
    return await response.json();
  } catch {
    return { message: response.statusText };
  }
}

/* ==========================================================================
   Custom Error Class
   Defines a custom ApiError class for structured API error handling.
   ========================================================================== */
/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

/* ==========================================================================
   Public API Methods
   Provides methods for submitting forms, registering children, creating payment 
   intents, and checking API health.
   ========================================================================== */
/**
 * Submits contact form data
 * @param {object} formData - Contact form data
 * @returns {Promise<object>} API response
 */
export async function submitContactForm(formData) {
  try {
    return await _makeRequest("/api/contacts", {
      method: "POST",
      body: JSON.stringify(formData),
    });
  } catch (error) {
    console.error("Contact form submission failed:", error);
    throw new Error(
      error.message || "Failed to submit contact form. Please try again later."
    );
  }
}

/**
 * Registers a child for the program
 * @param {object} formData - Child registration data
 * @returns {Promise<object>} API response
 */
export async function registerChild(formData) {
  try {
    return await _makeRequest("/api/registrations", {
      method: "POST",
      body: JSON.stringify(formData),
    });
  } catch (error) {
    console.error("Child registration failed:", error);
    throw new Error(
      error.message || "Failed to register child. Please try again later."
    );
  }
}

/**
 * Creates a payment intent
 * @param {number} amount - Payment amount in smallest currency unit
 * @param {string} email - Customer email
 * @returns {Promise<object>} Payment intent data
 */
export async function createPaymentIntent(amount, email) {
  try {
    return await _makeRequest("/api/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ amount, email }),
    });
  } catch (error) {
    console.error("Payment intent creation failed:", error);
    throw new Error(
      error.message || "Failed to initiate payment. Please try again later."
    );
  }
}

/**
 * Health check for API
 * @returns {Promise<boolean>} True if API is healthy
 */
export async function checkApiHealth() {
  try {
    await _makeRequest("/api/health", { method: "GET" }, 3000);
    return true;
  } catch {
    return false;
  }
}
