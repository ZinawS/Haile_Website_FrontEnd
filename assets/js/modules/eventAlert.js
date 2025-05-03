function setCookie(name, value, days) {
  let expires = "";
  if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function clearCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

function showPopup() {
  const popup = document.getElementById('event-popup');
  const overlay = document.getElementById('popup-overlay');
  const closeButton = document.getElementById('close-popup');

  if (!popup || !overlay) {
      console.error('Popup elements missing: event-popup or popup-overlay not found');
      return;
  }

  // Clear cookie for testing
  clearCookie('popupShown');

  const cookie = getCookie('popupShown');
  const urlParams = new URLSearchParams(window.location.search);
  const forcePopup = urlParams.get('forcePopup') === 'true';

  console.debug('Popup cookie status:', cookie, 'Force popup:', forcePopup);

  if (!cookie || forcePopup) {
      popup.style.display = 'block';
      overlay.style.display = 'block';
      if (!forcePopup) {
          setCookie('popupShown', 'true', 0.00001); // ~1 second for testing
      }
      popup.focus();

      // Verify visibility
      const computedStyle = window.getComputedStyle(popup);
      console.debug('Popup display:', computedStyle.display);
      console.debug('Popup visibility:', computedStyle.visibility);
      console.debug('Popup z-index:', computedStyle.zIndex);
      console.debug('Popup position:', computedStyle.position);
      console.debug('Popup displayed');
  } else {
      console.debug('Popup not shown: cookie already set');
  }

  if (closeButton) {
      closeButton.addEventListener('click', () => {
          popup.style.display = 'none';
          overlay.style.display = 'none';
          console.debug('Popup closed via close button');
      });
  }

  overlay.addEventListener('click', () => {
      popup.style.display = 'none';
      overlay.style.display = 'none';
      console.debug('Popup closed via overlay click');
  });

  document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popup.style.display === 'block') {
          popup.style.display = 'none';
          overlay.style.display = 'none';
          console.debug('Popup closed via Escape key');
      }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.debug('DOMContentLoaded fired for popup.js');
  showPopup();
});

window.addEventListener('load', () => {
  console.debug('window.onload fired for popup.js');
  if (!getCookie('popupShown') || new URLSearchParams(window.location.search).get('forcePopup') === 'true') {
      showPopup();
  }
});