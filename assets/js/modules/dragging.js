// dragging.js
const dragingPaymentForm = () => {
    const donationForm = document.getElementById("donation-form");
    const dragHeader = document.getElementById("donation-form-header");
  
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
  
    const startDrag = (x, y) => {
      const rect = donationForm.getBoundingClientRect();
      offsetX = x - rect.left;
      offsetY = y - rect.top;
      isDragging = true;
      
      // Disable the page scroll while dragging
      document.body.style.overflow = "hidden"; // Disable scroll on page
      document.body.style.userSelect = "none"; // Prevent text selection while dragging
    };
  
    const onDrag = (x, y) => {
      if (!isDragging) return;
      donationForm.style.left = `${x - offsetX}px`;
      donationForm.style.top = `${y - offsetY}px`;
      donationForm.style.position = "fixed";
    };
  
    const stopDrag = () => {
      isDragging = false;
      
      // Re-enable scrolling for the body once dragging stops
      document.body.style.overflow = "auto";
      document.body.style.userSelect = "auto";
    };
  
    // Mouse support for dragging
    dragHeader.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });
  
    document.addEventListener("mousemove", (e) => onDrag(e.clientX, e.clientY));
    document.addEventListener("mouseup", stopDrag);
  
    // Touch support for dragging
    dragHeader.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    });
  
    document.addEventListener("touchmove", (e) => {
      const touch = e.touches[0];
      onDrag(touch.clientX, touch.clientY);
    });
  
    document.addEventListener("touchend", stopDrag);
  };
  
  dragingPaymentForm();