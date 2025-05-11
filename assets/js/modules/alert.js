/** * Enhanced Alert Banner System with Close Button and Animation */ document.addEventListener(
  "DOMContentLoaded",
  function () {
    loadAlertBanner();
  }
);
async function loadAlertBanner() {
  try {
    const response = await fetch("./assets/js/modules/alertData.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const alertData = await response.json();
    console.log("Alert data loaded:", alertData);
    if (alertData.isApprovedforDisplay && alertData.message) {
      showAlertBanner(alertData.message, {
        backgroundColor: "#ff4444",
        textColor: "#ffffff",
        accentColor: "#ffcccc",
        fontWeight: "bold",
        fontSize: "16px",
        padding: "12px",
        flashDuration: 3000,
        flashInterval: 300,
        borderRadius: "4px",
        margin: "10px auto",
        maxWidth: "90%",
      });
    }
  } catch (error) {
    console.error("Alert system error:", error.message);
  }
}
function showAlertBanner(message, styleOptions = {}) {
  const container =
    document.getElementById("global-alert-container") || createAlertContainer();
  container.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = "alert-banner";
  banner.innerHTML = ` <div class="alert-content"> <div class="alert-icon">⚠️</div> <div class="alert-text"> <h3 class="alert-title">ALERT NOTIFICATION</h3> <p class="alert-message">${message}</p> </div> <button class="alert-close">&times;</button> </div> `;
  applyBannerStyles(banner, styleOptions);
  container.appendChild(banner);
  setupBannerBehavior(banner, container, styleOptions);
}
function createAlertContainer() {
  const container = document.createElement("div");
  container.id = "global-alert-container";
  container.style.cssText = ` position: fixed; top: 0; left: 0; right: 0; z-index: 9999; width: 100%; display: flex; justify-content: center; `;
  document.body.prepend(container);
  return container;
}
function applyBannerStyles(banner, options) {
  const styles = {
    backgroundColor: options.backgroundColor || "#ff4444",
    color: options.textColor || "#ffffff",
    padding: options.padding || "12px 20px",
    borderRadius: options.borderRadius || "4px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    width: "100%",
    maxWidth: options.maxWidth || "1200px",
    margin: options.margin || "10px",
    borderLeft: `4px solid ${options.accentColor || "#ffcccc"}`,
    display: "flex",
    alignItems: "center",
    transition: "all 0.3s ease",
    opacity: "0",
    transform: "translateY(-20px)",
    animation: "fadeIn 0.5s forwards",
  };
  Object.assign(banner.style, styles);
  const styleSheet = document.createElement("style");
  styleSheet.textContent = ` @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } } .alert-banner { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; } .alert-content { display: flex; align-items: center; text-align:center; width: 100%; } .alert-icon { font-size: 24px; margin-right: 15px; } .alert-text { flex: 1; } .alert-title { margin: 0 0 5px 0; font-size: 18px; letter-spacing: 0.5px; } .alert-message { margin: 0; line-height: 1.5; } .alert-close { background: transparent; border: none; color: ${options.textColor || "#ffffff"}; font-size: 24px; cursor: pointer; padding: 0 0 0 15px; opacity: 0.7; transition: opacity 0.2s; } .alert-close:hover { opacity: 1; } `;
  document.head.appendChild(styleSheet);
}
function setupBannerBehavior(banner, container, options) {
  let flashCount = 0;
  const maxFlashes = Math.floor(
    (options.flashDuration || 3000) / (options.flashInterval || 300)
  );
  const flashInterval = setInterval(() => {
    banner.style.opacity = banner.style.opacity === "0.8" ? "1" : "0.8";
    if (++flashCount >= maxFlashes) clearInterval(flashInterval);
  }, options.flashInterval || 300);
  const closeBtn = banner.querySelector(".alert-close");
  closeBtn.addEventListener("click", () => {
    banner.style.animation = "none";
    banner.style.opacity = "0";
    banner.style.transform = "translateY(-20px)";
    setTimeout(() => container.remove(), 300);
    document.body.style.marginTop = "0";
  });
  const bannerHeight = banner.offsetHeight;
  document.body.style.marginTop = `${bannerHeight}px`;
  document.body.style.transition = "margin-top 0.3s ease";
}
