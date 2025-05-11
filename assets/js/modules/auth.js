/* ==========================================================================
   Authentication Module
   Handles login, registration, logout, password reset, and user state management.
   ========================================================================== */

import showModal from "./showModal.js";

/* ==========================================================================
   Configuration
   Defines API settings with support for environment variables and retry logic.
   ========================================================================== */
const API_CONFIG = {
  baseUrl: window.config?.API_BASE_URL || "http://localhost:3000",
  defaultTimeout: 8000,
  maxRetries: 2,
  retryDelay: 1000,
};

/* ==========================================================================
   Utility Functions
   Provides input sanitization and validation for security and data integrity.
   ========================================================================== */
// Sanitizes input to prevent XSS attacks
const sanitizeInput = (input) => {
  if (typeof input !== "string") return "";
  return input.replace(/[<>"'%;()&+]/g, "");
};

// Validates email format
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validates password strength (min 8 chars, 1 letter, 1 number)
// const isValidPassword = (password) =>
//   /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);

/* ==========================================================================
   API Service
   Handles HTTP requests to the backend with retry logic and error handling.
   ========================================================================== */
class ApiService {
  // Performs fetch with retries and timeout
  static async fetchWithRetries(url, options, retries = API_CONFIG.maxRetries) {
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          API_CONFIG.defaultTimeout
        );
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: "Request failed" }));
          throw new Error(error.error || `HTTP error: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i === retries || error.name === "AbortError") {
          throw new Error(error.message || "Network error");
        }
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.retryDelay)
        );
      }
    }
  }

  // Handles login API call
  static async login(email, password) {
    const response = await this.fetchWithRetries(
      `${API_CONFIG.baseUrl}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sanitizeInput(email),
          password: sanitizeInput(password),
        }),
      }
    );
    return response.json();
  }

  // Handles registration API call
  static async register(first_name, last_name, email, password) {
    await this.fetchWithRetries(`${API_CONFIG.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: sanitizeInput(first_name),
        last_name: sanitizeInput(last_name),
        email: sanitizeInput(email),
        password: sanitizeInput(password),
      }),
    });
  }

  // Handles forgot password API call
  static async forgotPassword(email) {
    await this.fetchWithRetries(
      `${API_CONFIG.baseUrl}/api/auth/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizeInput(email) }),
      }
    );
  }

  // Handles password reset API call
  static async resetPassword(token, newPassword) {
    await this.fetchWithRetries(
      `${API_CONFIG.baseUrl}/api/auth/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sanitizeInput(token),
          newPassword: sanitizeInput(newPassword),
        }),
      }
    );
  }

  // Fetches current user data
  static async getUser(token) {
    const response = await this.fetchWithRetries(
      `${API_CONFIG.baseUrl}/api/auth/me`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.json();
  }

  // Handles logout API call
  static async logout(token) {
    await this.fetchWithRetries(`${API_CONFIG.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

/* ==========================================================================
   Modal Manager
   Manages modal visibility, creation, and cleanup for authentication flows.
   ========================================================================== */
class ModalManager {
  // Shows confirmation or error messages with fallback modal
  static showConfirmation(message, isError = false) {
    try {
      showModal(message, isError);
    } catch (error) {
      // Fallback confirmation modal
      const modal = document.createElement("div");
      modal.id = "confirmation-modal";
      modal.className = `modal ${isError ? "modal-error" : "modal-success"}`;
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close" data-modal-close="confirmation-modal">×</span>
          <p>${sanitizeInput(message)}</p>
        </div>
      `;
      document.body.appendChild(modal);
      modal.style.display = "block";
      modal.style.visibility = "visible";
      modal.style.zIndex = "1300";
      modal.classList.add("modal-visible");
    }
  }

  // Closes a specific modal and cleans up auth-related modals
  static closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("modal-hidden");
      modal.classList.remove("modal-visible");
      modal.style.display = "none";
      modal.style.visibility = "hidden";
      modal.style.zIndex = "-1";
      if (modalId === "reset-password-modal") {
        modal.remove();
      }
    }
    // Clean up only auth-related modals
    document
      .querySelectorAll(
        "#login-modal, #reset-password-modal, #confirmation-modal"
      )
      .forEach((m) => {
        if (m.id !== modalId) {
          m.classList.add("modal-hidden");
          m.style.display = "none";
          m.style.visibility = "hidden";
          m.style.zIndex = "-1";
        }
      });
    window.history.replaceState(null, "", window.location.pathname);
  }

  // Toggles between login, register, and forgot password forms
  static toggleForms(formType) {
    const loginModal = document.getElementById("login-modal");
    const containers = {
      login: document.getElementById("login-form-container"),
      register: document.getElementById("register-form-container"),
      "forgot-password": document.getElementById("forgot-password-container"),
    };

    if (!loginModal || !Object.values(containers).every(Boolean)) {
      return;
    }

    Object.values(containers).forEach(
      (container) => (container.style.display = "none")
    );
    containers[formType].style.display = "block";

    loginModal.style.display = "block";
    loginModal.style.visibility = "visible";
    loginModal.style.zIndex = "1100";
    loginModal.classList.add("modal-visible");
    loginModal.classList.remove("modal-hidden");
  }

  // Creates the reset password modal dynamically
  static createResetPasswordModal(token) {
    const existingModal = document.getElementById("reset-password-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "reset-password-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" data-modal-close="reset-password-modal">×</span>
        <h3>Reset Password</h3>
        <form id="reset-password-form">
          <input type="password" id="reset-password" placeholder="New Password" required autocomplete="new-password"/>
          <button type="submit">Reset Password</button>
        </form>
        <p class="toggle-form">
          Back to <a href="#login" data-toggle-form="login">Login</a>
        </p>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = "block";
    modal.style.visibility = "visible";
    modal.style.zIndex = "1200";
    modal.classList.add("modal-visible");
  }
}

/* ==========================================================================
   Authentication Service
   Orchestrates authentication logic, UI updates, and event handling.
   ========================================================================== */
class AuthService {
  constructor() {
    this.authState = {
      user: null,
      token: localStorage.getItem("token") || null,
    };
  }

  // Initializes authentication state and event listeners
  async init() {
    if (this.authState.token) {
      try {
        this.authState.user = await ApiService.getUser(this.authState.token);
        this.updateUI();
      } catch {
        this.logout();
      }
    }
    this.setupEventListeners();
    this.handlePasswordReset();
  }

  // Updates UI based on authentication state
  updateUI() {
    const authLink = document.getElementById("auth-link");
    const userGreeting = document.getElementById("user-greeting");
    const userNameSpan = document.getElementById("user-name");
    const adminControls = document.getElementById("admin-controls");

    if (!authLink || !userGreeting || !userNameSpan) return;

    if (this.authState.user) {
      authLink.textContent = "Logout";
      authLink.href = "#logout";
      userGreeting.style.display = "inline";
      userNameSpan.textContent = sanitizeInput(this.authState.user.first_name);
      if (adminControls) {
        adminControls.style.display =
          this.authState.user.role === "admin" ? "block" : "none";
      }
    } else {
      authLink.textContent = "Login";
      authLink.href = "#login";
      userGreeting.style.display = "none";
      if (adminControls) adminControls.style.display = "none";
    }
  }

  // Handles login process
  async login(email, password) {
    if (!isValidEmail(email)) {
      ModalManager.showConfirmation("Invalid email format", true);
      return;
    }
    // if (!isValidPassword(password)) {
    //   ModalManager.showConfirmation(
    //     "Password must be at least 8 characters with a letter and a number",
    //     true
    //   );
    //   return;
    // }
    try {
      const { user, token } = await ApiService.login(email, password);
      this.authState.user = user;
      this.authState.token = token;
      localStorage.setItem("token", token);
      ModalManager.closeModal("login-modal");
      this.updateUI();
      ModalManager.showConfirmation("Login successful!");
    } catch (error) {
      ModalManager.showConfirmation(error.message || "Login failed", true);
    }
  }

  // Handles registration process
  async register(first_name, last_name, email, password) {
    if (
      !first_name ||
      !last_name ||
      !isValidEmail(email)

      //   ||!isValidPassword(password)
    ) {
      ModalManager.showConfirmation(
        "Please fill in all fields correctly",
        true
      );
      return;
    }
    try {
      await ApiService.register(first_name, last_name, email, password);
      ModalManager.showConfirmation("Registration successful! Please login.");
      ModalManager.toggleForms("login");
      document.getElementById("register-form")?.reset();
    } catch (error) {
      ModalManager.showConfirmation(
        error.message || "Registration failed",
        true
      );
    }
  }

  // Handles forgot password process
  async forgotPassword(email) {
    if (!isValidEmail(email)) {
      ModalManager.showConfirmation("Invalid email format", true);
      return;
    }
    try {
      await ApiService.forgotPassword(email);
      ModalManager.showConfirmation("Password reset link sent to your email.");
      ModalManager.toggleForms("login");
      document.getElementById("forgot-password-form")?.reset();
    } catch (error) {
      ModalManager.showConfirmation(
        error.message || "Failed to send reset link",
        true
      );
    }
  }

  // Handles password reset process
  async resetPassword(token, newPassword) {
    // if (!isValidPassword(newPassword)) {
    //   ModalManager.showConfirmation(
    //     "Password must be at least 8 characters with a letter and a number",
    //     true
    //   );
    //   return;
    // }
    try {
      await ApiService.resetPassword(token, newPassword);
      ModalManager.showConfirmation("Password reset successful! Please login.");
      ModalManager.closeModal("reset-password-modal");
    } catch (error) {
      ModalManager.showConfirmation(
        error.message || "Failed to reset password",
        true
      );
    }
  }

  // Handles logout process
  async logout() {
    try {
      await ApiService.logout(this.authState.token);
    } finally {
      this.authState.user = null;
      this.authState.token = null;
      localStorage.removeItem("token");
      this.updateUI();
      ModalManager.showConfirmation("Logged out successfully");
    }
  }

  // Checks for password reset token and creates modal if present
  handlePasswordReset() {
    const urlParams = new URLSearchParams(window.location.search);
    let resetToken = urlParams.get("token");
    if (!resetToken) {
      const hashParams = new URLSearchParams(
        window.location.hash.split("?")[1] || ""
      );
      resetToken = hashParams.get("token");
    }
    if (!resetToken) return;

    ModalManager.createResetPasswordModal(resetToken);
    const resetForm = document.getElementById("reset-password-form");
    if (resetForm) {
      resetForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const newPassword = document.getElementById("reset-password")?.value;
        await this.resetPassword(resetToken, newPassword);
      });
    }
  }

  // Sets up event listeners for forms and UI elements
  setupEventListeners() {
    document.addEventListener("click", (event) => {
      const target = event.target;

      // Handle modal close buttons
      if (target.dataset.modalClose) {
        event.stopPropagation();
        ModalManager.closeModal(target.dataset.modalClose);
      }

      // Handle form toggles
      if (target.dataset.toggleForm) {
        event.preventDefault();
        ModalManager.toggleForms(target.dataset.toggleForm);
      }

      // Handle auth link (login/logout)
      if (target.id === "auth-link") {
        event.preventDefault();
        if (this.authState.user) {
          this.logout();
        } else {
          ModalManager.toggleForms("login");
        }
      }
    });

    // Handle form submissions
    const forms = {
      "login-form": (event) => {
        event.preventDefault();
        const email = document.getElementById("login-email")?.value;
        const password = document.getElementById("login-password")?.value;
        this.login(email, password);
      },
      "register-form": (event) => {
        event.preventDefault();
        const first_name = document.getElementById(
          "register-first-name"
        )?.value;
        const last_name = document.getElementById("register-last-name")?.value;
        const email = document.getElementById("register-email")?.value;
        const password = document.getElementById("register-password")?.value;
        this.register(first_name, last_name, email, password);
      },
      "forgot-password-form": (event) => {
        event.preventDefault();
        const email = document.getElementById("forgot-password-email")?.value;
        this.forgotPassword(email);
      },
    };

    Object.entries(forms).forEach(([formId, handler]) => {
      const form = document.getElementById(formId);
      if (form) {
        form.removeEventListener("submit", handler);
        form.addEventListener("submit", handler);
      }
    });
  }
}

/* ==========================================================================
   Module Initialization
   Starts the authentication service and sets up listeners.
   ========================================================================== */
const auth = new AuthService();
document.addEventListener("DOMContentLoaded", () => auth.init());
window.addEventListener("hashchange", () => auth.handlePasswordReset());

/* ==========================================================================
   Exports
   Exposes auth state for use in other modules.
   ========================================================================== */
export const authState = auth.authState;
