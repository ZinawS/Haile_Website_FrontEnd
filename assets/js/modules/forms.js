/**
 * FormManager - Manages dynamic form behavior for contact and children registration forms
 *
 * Key Features:
 * - Dynamic form visibility toggling
 * - Country/state dropdown management with Select2
 * - Time slot generation and timezone conversion
 * - Comprehensive error handling
 * - Form reset functionality
 *
 * Dependencies:
 * - formData.js (COUNTRIES, US_STATES, TIMEZONES)
 * - showModal.js (for displaying notifications)
 * - Select2 (for enhanced dropdowns)
 * - Luxon (for timezone handling)
 */

import { COUNTRIES, US_STATES, TIMEZONES } from "./formData.js";
import showModal from "./showModal.js";

class FormManager {
  /**
   * Initializes FormManager instance
   * @constructor
   * @throws {Error} If critical elements are missing
   */
  constructor() {
    // Initialize state flags
    this._countryInitialized = false;
    this._dependenciesLoaded = false;
    this._initialized = false;

    // Cache DOM elements with null checks
    this.elements = this._cacheElements();
    if (!this._validateElements()) {
      throw new Error("Required form elements not found");
    }

    // Initialize with error handling
    try {
      this._initialize();
    } catch (error) {
      console.error("FormManager initialization failed:", error);
      showModal(
        "Form system initialization failed. Please refresh the page.",
        "error"
      );
      throw error;
    }
  }

  // --------------------------
  // PRIVATE METHODS
  // --------------------------

  /**
   * Caches DOM elements
   * @private
   * @returns {Object} Cached elements
   */
  _cacheElements() {
    return {
      subjectSelect: document.getElementById("subject-select"),
      childrenForm: document.getElementById("children-registration"),
      contactForm: document.getElementById("contact-form"),
      countrySelect: document.getElementById("country"),
      stateGroup: document.getElementById("state-group"),
      stateSelect: document.getElementById("state"),
      classDate: document.getElementById("class_date"),
      timeSlot: document.getElementById("time_slot"),
      utcTime: document.getElementById("start_time_utc"),
      cancelButton: document.getElementById("cancel-registration"),
    };
  }

  /**
   * Validates required DOM elements exist
   * @private
   * @returns {boolean} True if all critical elements exist
   */
  _validateElements() {
    const requiredElements = [
      "subjectSelect",
      "childrenForm",
      "contactForm",
      "countrySelect",
      "classDate",
      "timeSlot",
      "utcTime",
    ];

    return requiredElements.every(
      (key) => this.elements[key] !== null && this.elements[key] !== undefined
    );
  }

  /**
   * Main initialization sequence
   * @private
   */
  async _initialize() {
    try {
      await this._loadDependencies();
      this._setupForm();
      this._setupEventListeners();
      this._dependenciesLoaded = true;
      this._initialized = true;
    } catch (error) {
      console.error("FormManager setup failed:", error);
      showModal(
        "Failed to load form dependencies. Please check your connection.",
        "error"
      );
      throw error;
    }
  }

  /**
   * Loads required external dependencies
   * @private
   * @returns {Promise} Resolves when all dependencies are loaded
   * @throws {Error} If dependency loading fails
   */
  _loadDependencies() {
    return new Promise((resolve, reject) => {
      const dependencies = [
        {
          type: "css",
          url: "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css",
          id: "select2-css",
          integrity:
            "sha384-3gk4zcfpcX9AtCOyYJuwZ0HqDK+UXzKLFgGCSFj4w5G+l6Pwn4CuDZPhK3Avkzj8",
          crossorigin: "anonymous",
        },
        {
          type: "script",
          url: "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js",
          id: "select2-js",
          integrity:
            "sha384-p1E3qvM+6jkCh6xE7R9zJMXjU3gZMtTGSl2NYFh4XNo9+yEmf3gEyybwUzsR+P3O",
          crossorigin: "anonymous",
        },
        {
          type: "script",
          url: "https://cdn.jsdelivr.net/npm/luxon@3.4.3/build/global/luxon.min.js",
          id: "luxon-js",
          integrity:
            "sha384-RVo9aEqtUlPvAfPIRN8YoErByMBldmFaEzRVR7kQJK9LEeFS0oLulWw3qEwl0mLJ",
          crossorigin: "anonymous",
        },
      ];

      let loadedCount = 0;
      const totalDependencies = dependencies.length;

      const handleLoad = () => {
        loadedCount++;
        if (loadedCount === totalDependencies) resolve();
      };

      const handleError = (error) => {
        console.error("Dependency loading failed:", error);
        reject(new Error(`Failed to load ${error.target.src}`));
      };

      dependencies.forEach((dep) => {
        if (this._isDependencyLoaded(dep.id)) {
          handleLoad();
        } else if (dep.type === "script") {
          this._loadScript(dep.url, dep.id, handleLoad, handleError);
        } else {
          this._loadCSS(dep.url, dep.id, handleLoad, handleError);
        }
      });
    });
  }

  /**
   * Checks if a dependency is already loaded
   * @private
   * @param {string} id - Dependency identifier
   * @returns {boolean} True if already loaded
   */
  _isDependencyLoaded(id) {
    return Boolean(document.getElementById(id));
  }

  /**
   * Helper to load scripts dynamically
   * @private
   * @param {string} url - Script URL
   * @param {string} id - Script element ID
   * @param {function} onSuccess - Success callback
   * @param {function} onError - Error callback
   */
  _loadScript(url, id, onSuccess, onError) {
    const script = document.createElement("script");
    script.src = url;
    script.id = id;
    script.onload = onSuccess;
    script.onerror = onError;
    document.body.appendChild(script);
  }

  /**
   * Helper to load CSS dynamically
   * @private
   * @param {string} url - CSS URL
   * @param {string} id - Link element ID
   * @param {function} onSuccess - Success callback
   * @param {function} onError - Error callback
   */
  _loadCSS(url, id, onSuccess, onError) {
    const link = document.createElement("link");
    link.href = url;
    link.id = id;
    link.rel = "stylesheet";
    link.onload = onSuccess;
    link.onerror = onError;
    document.head.appendChild(link);
  }

  /**
   * Configures form elements and initial state
   * @private
   */
  _setupForm() {
    this._updateFormVisibility();

    // Set date constraints
    this._configureDatePicker();

    // Initialize country dropdown
    this._initializeCountryDropdown();

    // Generate time slots
    this._generateTimeSlots();

    // Set initial UTC time
    this._updateUTCTime();
  }

  /**
   * Configures date picker with min/max dates
   * @private
   */
  _configureDatePicker() {
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    this.elements.classDate.min = today.toISOString().split("T")[0];
    this.elements.classDate.max = nextYear.toISOString().split("T")[0];
    this.elements.classDate.value = today.toISOString().split("T")[0];
  }

  /**
   * Initializes country dropdown with Select2
   * @private
   */
  _initializeCountryDropdown() {
    if (this._countryInitialized) return;

    const uniqueCountries = [...new Set(COUNTRIES)];
    this._populateSelect(this.elements.countrySelect, uniqueCountries);

    $(this.elements.countrySelect)
      .select2({
        placeholder: "Select Country",
        width: "100%",
        allowClear: true,
      })
      .on("change", () => this._handleCountryChange());

    this._countryInitialized = true;
  }

  /**
   * Sets up event listeners
   * @private
   */
  _setupEventListeners() {
    // Subject selection change
    this.elements.subjectSelect.addEventListener("change", () => {
      this._updateFormVisibility();
    });

    // Time slot change
    this.elements.timeSlot.addEventListener("change", () => {
      this._updateUTCTime();
    });

    // Cancel button
    if (this.elements.cancelButton) {
      this.elements.cancelButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetForm();
      });
    }

    // Date change
    this.elements.classDate.addEventListener("change", () => {
      this._updateUTCTime();
    });
  }

  /**
   * Toggles between children and contact form based on selection
   * @private
   */
  _updateFormVisibility() {
    const showChildrenForm =
      this.elements.subjectSelect.value === "children-life";

    this.elements.childrenForm.style.display = showChildrenForm
      ? "block"
      : "none";
    this.elements.contactForm.style.display = showChildrenForm
      ? "none"
      : "block";

    if (showChildrenForm) {
      this._updateUTCTime();
    }
  }

  /**
   * Handles country selection change
   * @private
   */
  _handleCountryChange() {
    const selectedCountry = this.elements.countrySelect.value;

    if (selectedCountry === "United States") {
      this._showStateDropdown();
    } else {
      this._hideStateDropdown();
    }

    this._updateUTCTime();
  }

  /**
   * Shows and populates state dropdown for US
   * @private
   */
  _showStateDropdown() {
    this.elements.stateGroup.style.display = "block";
    this._populateSelect(this.elements.stateSelect, US_STATES);

    $(this.elements.stateSelect)
      .select2({
        placeholder: "Select State",
        width: "100%",
        allowClear: true,
      })
      .on("change", () => this._updateUTCTime());
  }

  /**
   * Hides and resets state dropdown
   * @private
   */
  _hideStateDropdown() {
    this.elements.stateGroup.style.display = "none";
    if (this.elements.stateSelect) {
      $(this.elements.stateSelect).val(null).trigger("change");
    }
  }

  /**
   * Generates time slots from 6:00AM to 10:30PM in 30-minute increments
   * @private
   */
  _generateTimeSlots() {
    const slots = [];
    const startHour = 6; // 6:00 AM
    const endHour = 22; // 10:00 PM

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const start = this._formatTime(hour, min);
        const end = this._formatTime(hour, min + 30);
        slots.push(`${start}-${end}`);
      }
    }

    this._populateSelect(this.elements.timeSlot, slots);
  }

  /**
   * Formats time in 12-hour format with AM/PM
   * @private
   * @param {number} hour - 24-hour format hour
   * @param {number} minute - Minutes
   * @returns {string} Formatted time string (e.g. "9:30AM")
   */
  _formatTime(hour, minute) {
    const adjustedHour = minute >= 60 ? hour + 1 : hour;
    const displayHour =
      adjustedHour > 12
        ? adjustedHour - 12
        : adjustedHour === 0
          ? 12
          : adjustedHour;
    const displayMinute = minute % 60;
    const period = adjustedHour >= 12 ? "PM" : "AM";
    return `${displayHour}:${displayMinute.toString().padStart(2, "0")}${period}`;
  }

  /**
   * Updates UTC time display based on current selections
   * @private
   */
  _updateUTCTime() {
    try {
      const { timeSlot, countrySelect, stateSelect, classDate, utcTime } =
        this.elements;

      if (!timeSlot.value || !countrySelect.value || !classDate.value) {
        utcTime.value = "";
        return;
      }

      const timezone = this._getTimezone(
        countrySelect.value,
        stateSelect?.value
      );
      const utcString = this._convertToUTC(
        timeSlot.value.split("-")[0],
        classDate.value,
        timezone
      );

      utcTime.value = utcString;
    } catch (error) {
      console.error("UTC conversion failed:", error);
      this.elements.utcTime.value = "Time conversion error";
    }
  }

  /**
   * Gets timezone for selected country/state
   * @private
   * @param {string} country - Selected country
   * @param {string|null} state - Selected state (if applicable)
   * @returns {string} Timezone identifier
   */
  _getTimezone(country, state) {
    if (
      (country === "United States" || country === "United States of America") &&
      state
    ) {
      return TIMEZONES.states[state] || TIMEZONES.countries[country] || "UTC";
    }
    return TIMEZONES.countries[country] || "UTC";
  }

  /**
   * Converts local time to UTC using Luxon
   * @private
   * @param {string} timeStr - Time string (e.g. "9:30AM")
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @param {string} timezone - Timezone identifier
   * @returns {string} Formatted UTC string
   * @throws {Error} If conversion fails
   */
  _convertToUTC(timeStr, dateStr, timezone) {
    if (typeof luxon === "undefined" || !luxon.DateTime) {
      throw new Error("Luxon.js is not available");
    }

    // Parse input time
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
    if (!timeMatch) throw new Error(`Invalid time format: ${timeStr}`);

    let [, hourStr, minuteStr, period] = timeMatch;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Convert to 24-hour format
    if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

    // Create Luxon DateTime
    const [year, month, day] = dateStr.split("-").map(Number);
    const dt = luxon.DateTime.fromObject(
      { year, month, day, hour, minute },
      { zone: timezone }
    );

    if (!dt.isValid) {
      throw new Error(`Invalid date/time: ${dt.invalidExplanation}`);
    }

    return dt.toUTC().toFormat("yyyy-LL-dd HH:mm:ss") + " UTC";
  }

  /**
   * Populates a select element with options
   * @private
   * @param {HTMLSelectElement} selectElement - DOM select element
   * @param {Array} options - Array of option values
   */
  _populateSelect(selectElement, options) {
    if (!selectElement) return;

    selectElement.innerHTML = options
      .map((opt) => `<option value="${opt}">${opt}</option>`)
      .join("");
  }

  // --------------------------
  // PUBLIC METHODS
  // --------------------------

  /**
   * Resets form to initial state
   * @public
   */
  resetForm() {
    if (!this._initialized) return;

    this.elements.childrenForm.style.display = "none";
    this.elements.contactForm.style.display = "block";

    const childrenForm = document.getElementById("children-form");
    if (childrenForm) childrenForm.reset();

    if (this.elements.countrySelect) {
      $(this.elements.countrySelect).val(null).trigger("change");
    }

    if (this.elements.stateSelect) {
      $(this.elements.stateSelect).val(null).trigger("change");
    }

    if (this.elements.utcTime) {
      this.elements.utcTime.value = "";
    }
  }

  /**
   * Checks if FormManager is fully initialized
   * @public
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this._initialized;
  }
}

// Initialize when DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    try {
      window.formManager = new FormManager();
    } catch (error) {
      console.error("Failed to initialize FormManager:", error);
      showModal(
        "Form system failed to initialize. Please refresh the page.",
        "error"
      );
    }
  });
} else {
  try {
    window.formManager = new FormManager();
  } catch (error) {
    console.error("Failed to initialize FormManager:", error);
    showModal(
      "Form system failed to initialize. Please refresh the page.",
      "error"
    );
  }
}

export default FormManager;
