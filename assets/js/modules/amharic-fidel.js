/* ==========================================================================
   Amharic Fidel & Ge'ez Numbers Learning Tool
   Handles both alphabet and number systems with proper grid layouts and audio playback.
   ========================================================================== */

/* ==========================================================================
   Module Setup
   Executes initialization when the DOM is fully loaded.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================================
     Configuration
     Defines data paths, audio base path, and retry settings for the application.
     ========================================================================== */
  const CONFIG = {
    dataPaths: [
      "./assets/js/modules/fidel-data.json",
      "/assets/js/modules/fidel-data.json",
    ],
    audioBasePath: "./assets/js/modules/sound/",
    maxRetries: 2,
    retryDelay: 1000,
  };

  /* ==========================================================================
     DOM Elements
     References to key DOM elements used in the application.
     ========================================================================== */
  const elements = {
    showBtn: document.getElementById("show-amharic"),
    modal: document.getElementById("amharic-modal"),
    closeBtn: document.getElementById("close-modal"),
    grid: document.getElementById("amharic-grid"),
    categoryTabs: document.getElementById("category-tabs"),
    modalContent: document.querySelector("#amharic-modal .modal-content"),
  };

  /* ==========================================================================
     State Management
     Tracks application state, including data loading and active category.
     ========================================================================== */
  let isLoaded = false;
  let retryCount = 0;
  let currentData = null;
  let activeCategory = "alphabet";

  /* ==========================================================================
     Initialization
     Sets up the application by hiding the modal and attaching event listeners.
     ========================================================================== */
  const init = () => {
    elements.modal.style.display = "none";
    setupEventListeners();
  };

  /* ==========================================================================
     Event Listeners
     Configures all event listeners for modal controls and keyboard interactions.
     ========================================================================== */
  const setupEventListeners = () => {
    // Modal controls
    elements.showBtn.addEventListener("click", openModal);
    elements.closeBtn.addEventListener("click", closeModal);
    window.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    // Prevent modal content clicks from closing modal
    elements.modalContent.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  };

  /* ==========================================================================
     Modal Control Functions
     Manages opening, closing, and interaction with the Amharic modal.
     ========================================================================== */
  const openModal = async () => {
    elements.modal.style.display = "block";
    document.body.style.overflow = "hidden";

    if (!isLoaded) {
      try {
        currentData = await fetchFidelData();
        createCategoryTabs(currentData);
        renderCategory(activeCategory);
        isLoaded = true;
      } catch (error) {
        showError(error);
      }
    }
  };

  const closeModal = () => {
    elements.modal.style.display = "none";
    document.body.style.overflow = "";
  };

  const handleOutsideClick = (e) => {
    if (e.target === elements.modal) {
      closeModal();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && elements.modal.style.display === "block") {
      closeModal();
    }
  };

  /* ==========================================================================
     Data Handling Functions
     Fetches and validates Amharic Fidel and Ge'ez number data.
     ========================================================================== */
  const fetchFidelData = async () => {
    for (const path of CONFIG.dataPaths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;

        const data = await response.json();
        if (validateData(data)) {
          console.log("Data loaded successfully from:", path);
          return data;
        }
      } catch (error) {
        console.warn(`Failed to load from ${path}:`, error);
      }
    }
    throw new Error("Failed to load data from all specified paths");
  };

  const validateData = (data) => {
    return Array.isArray(data) && data.some((group) => group.category);
  };

  /* ==========================================================================
     Rendering Functions
     Creates category tabs and renders character/number grids based on selected category.
     ========================================================================== */
  const createCategoryTabs = (data) => {
    const categories = [...new Set(data.map((item) => item.category))];
    elements.categoryTabs.innerHTML = "";

    categories.forEach((category) => {
      const tab = document.createElement("button");
      tab.className = `category-tab ${category === activeCategory ? "active" : ""}`;
      tab.textContent = formatCategoryName(category);
      tab.dataset.category = category;
      tab.addEventListener("click", () => {
        activeCategory = category;
        renderCategory(category);
        updateActiveTab(category);
      });
      elements.categoryTabs.appendChild(tab);
    });
  };

  const formatCategoryName = (category) => {
    switch (category) {
      case "alphabet":
        return "Alphabet";
      case "numbers":
        return "Numbers";
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const updateActiveTab = (category) => {
    document.querySelectorAll(".category-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.category === category);
    });
  };

  const renderCategory = (category) => {
    if (!currentData) return;

    // Clear and prepare the grid
    elements.grid.innerHTML = "";
    elements.grid.className = "amharic-grid";
    elements.grid.classList.add(category);

    // Filter data for current category
    const categoryData = currentData.filter(
      (item) => item.category === category
    );

    // Render each group
    categoryData.forEach((group) => {
      // Add group heading if available
      if (group.groupName) {
        const heading = document.createElement("h4");
        heading.className = "group-heading";
        heading.textContent = group.groupName;
        elements.grid.appendChild(heading);
      }

      // Create buttons for each character/number
      group.fidels.forEach((character, index) => {
        const button = createCharacterButton(
          character,
          group.pronunciations?.[index] || "",
          group.audio?.[index] || "",
          category === "numbers"
        );
        elements.grid.appendChild(button);
      });
    });
  };

  const createCharacterButton = (
    character,
    pronunciation,
    audioFile,
    isNumber = false
  ) => {
    const button = document.createElement("button");
    const typeClass = isNumber ? "number" : "alphabet";

    button.className = `fidel-btn ${typeClass}`;
    button.innerHTML = `
      <span class="fidel-char ${typeClass}">${character}</span>
      ${pronunciation ? `<span class="fidel-pronunciation ${typeClass}">${pronunciation}</span>` : ""}
    `;

    if (audioFile) {
      button.addEventListener("click", () => playAudio(audioFile, button));
    } else {
      button.classList.add("error");
    }

    return button;
  };

  /* ==========================================================================
     Audio Handling Functions
     Manages audio playback for character/number pronunciation.
     ========================================================================== */
  const playAudio = async (audioFile, button) => {
    try {
      const audioPath = getFullAudioPath(audioFile);
      const audio = new Audio(audioPath);

      audio.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        showButtonError(button);
      });

      button.classList.add("playing");
      await audio.play();
    } catch (error) {
      console.error("Audio playback failed:", error);
      showButtonError(button);
    } finally {
      setTimeout(() => {
        button.classList.remove("playing");
      }, 500);
    }
  };

  const getFullAudioPath = (audioFile) => {
    if (audioFile.startsWith("http") || audioFile.startsWith("/")) {
      return audioFile;
    }
    return `${CONFIG.audioBasePath}${encodeURIComponent(audioFile)}`;
  };

  /* ==========================================================================
     Error Handling Functions
     Displays error messages for data loading or audio playback failures.
     ========================================================================== */
  const showError = (error) => {
    console.error("Application error:", error);
    elements.grid.innerHTML = `
      <div class="error-message">
        <h4>⚠️ Loading Error</h4>
        <p>${error.message}</p>
        <button class="retry-btn">Retry</button>
      </div>`;

    document.querySelector(".retry-btn").addEventListener("click", async () => {
      if (retryCount < CONFIG.maxRetries) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, CONFIG.retryDelay));
        await openModal();
      }
    });
  };

  const showButtonError = (button) => {
    button.classList.add("error");
    setTimeout(() => button.classList.remove("error"), 1000);
  };

  /* ==========================================================================
     Application Start
     Initializes the Amharic Fidel learning tool.
     ========================================================================== */
  init();
});
