// assets/js/modules/navigation.js

export function setupNavigation() {
  // Hamburger Menu
  const hamburger = document.querySelector(".hamburger");
  const nav = document.querySelector(".nav-mobile");

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav.classList.toggle("active");
  });

  // Close menu when clicking a nav link
  document.querySelectorAll(".nav-mobile a").forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      nav.classList.remove("active");
    });
  });
}
setupNavigation();
