/* ==========================================================================
   Popup Module
   Manages the display of event popups using JSON data, with cookie-based control,
   approval status checking, and dynamic content rendering.
   ========================================================================== */

/* ==========================================================================
   Configuration
   Defines the JSON data path and cookie settings for popup display.
   ========================================================================== */
const POPUP_CONFIG = {
  dataPath: "./assets/js/modules/eventAlert-data.json",
  cookieName: "popupShown",
  cookieDuration: 0.00001, // ~1 second for testing
};

/* ==========================================================================
   Cookie Management
   Handles setting, getting, and clearing cookies to control popup visibility.
   ========================================================================== */
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function clearCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

/* ==========================================================================
   Popup Data Fetching
   Loads popup data from JSON and validates it.
   ========================================================================== */
async function fetchPopupData() {
  try {
    const response = await fetch(POPUP_CONFIG.dataPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch popup data: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid popup data format");
    }
    return data;
  } catch (error) {
    //console.error("Error fetching popup data:", error);
    return null;
  }
}

/* ==========================================================================
   Popup Display Logic
   Displays the popup if approved and cookie/forcePopup conditions are met.
   ========================================================================== */
function showPopup() {
  const popup = document.getElementById("event-popup");
  const overlay = document.getElementById("popup-overlay");
  const closeButton = document.getElementById("close-popup");

  if (!popup || !overlay) {
    // //console.error(
    // //   "Popup elements missing: event-popup or popup-overlay not found"
    // );
    return;
  }

  // Fetch popup data
  fetchPopupData().then((popupData) => {
    if (!popupData) {
      //console.error("No popup data available");
      return;
    }

    // Find the first approved popup
    const approvedPopup = popupData.find((p) => p.isApproved);
    if (!approvedPopup) {
      //console.debug("No approved popups found");
      return;
    }

    // Check cookie and forcePopup
    // Clear cookie for testing
    clearCookie(POPUP_CONFIG.cookieName);

    const cookie = getCookie(POPUP_CONFIG.cookieName);
    const urlParams = new URLSearchParams(window.location.search);
    const forcePopup = urlParams.get("forcePopup") === "true";

    //console.debug("Popup cookie status:", cookie, "Force popup:", forcePopup);

    if (!cookie || forcePopup) {
      // Populate popup with JSON data
      popup.innerHTML = `
        <h2 id="popup-title" class="text-2xl font-bold text-gray-800">
          🔔 ${approvedPopup.title}
        </h2>
        <p class="mt-2 text-lg">${approvedPopup.description}</p>
        <p class="mt-1">🗓 Date: ${new Date(approvedPopup.date).toLocaleDateString()}</p>
        <p class="mt-1">📍 ${approvedPopup.location}</p>
        <a
          href="${approvedPopup.registrationLink}"
          class="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          aria-label="Register for the event"
        >👉 Register Now</a>
        <button
          id="close-popup"
          class="mt-4 text-gray-600 underline"
          aria-label="Close pop-up"
        >Close</button>
      `;

      // Show popup and overlay
      popup.style.display = "block";
      overlay.style.display = "block";
      if (!forcePopup) {
        setCookie(POPUP_CONFIG.cookieName, "true", POPUP_CONFIG.cookieDuration);
      }
      popup.focus();

      // Verify visibility
      const computedStyle = window.getComputedStyle(popup);
      //console.debug("Popup display:", computedStyle.display);
      //console.debug("Popup visibility:", computedStyle.visibility);
      //console.debug("Popup z-index:", computedStyle.zIndex);
      //console.debug("Popup position:", computedStyle.position);
      //console.debug("Popup displayed with data:", approvedPopup);

      // Reattach close button listener (since button is recreated)
      const newCloseButton = document.getElementById("close-popup");
      if (newCloseButton) {
        newCloseButton.addEventListener("click", () => {
          popup.style.display = "none";
          overlay.style.display = "none";
          //console.debug("Popup closed via close button");
        });
      }
    } else {
      //console.debug("Popup not shown: cookie already set");
    }

    // Overlay click handler
    overlay.addEventListener("click", () => {
      popup.style.display = "none";
      overlay.style.display = "none";
      //console.debug("Popup closed via overlay click");
    });

    // Escape key handler
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && popup.style.display === "block") {
        popup.style.display = "none";
        overlay.style.display = "none";
        //console.debug("Popup closed via Escape key");
      }
    });
  });
}

/* ==========================================================================
   Event Listeners
   Initializes popup display on DOM load and window load with cookie checks.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  //console.debug("DOMContentLoaded fired for popup.js");
  showPopup();
});

window.addEventListener("load", () => {
  //console.debug("window.onload fired for popup.js");
  if (
    !getCookie(POPUP_CONFIG.cookieName) ||
    new URLSearchParams(window.location.search).get("forcePopup") === "true"
  ) {
    showPopup();
  }
});
