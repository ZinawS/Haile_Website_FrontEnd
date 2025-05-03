function setupToggle(toggleBtnId, contentId, collapsedClass = "collapsed", texts = { show: "Read More", hide: "Show Less" }) {
    const btn = document.getElementById(toggleBtnId);
    const content = document.getElementById(contentId);

    if (!btn || !content) return;

    btn.addEventListener("click", function () {
      content.classList.toggle(collapsedClass);
      btn.textContent = content.classList.contains(collapsedClass)
        ? texts.show
        : texts.hide;
    });
  }

  // Example usage:
  setupToggle("toggleBtn", "aimContent");