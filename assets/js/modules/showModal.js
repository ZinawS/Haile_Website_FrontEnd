export default function showModal(message) {
    const modal = document.getElementById("notificationModal");
    const messageBox = document.getElementById("modalMessage");
    const closeBtn = document.getElementById("modalCloseBtn");
  
    messageBox.textContent = message;
    modal.style.display = "flex";
  
    closeBtn.onclick = () => modal.style.display = "none";
  
    // Optional: auto-close after 3 seconds
    setTimeout(() => {
      modal.style.display = "none";
    }, 20000);
  }