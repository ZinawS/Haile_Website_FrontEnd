/* ==========================================================================
   Blog Module
   Handles CRUD operations for blog posts with Quill editor, spell/grammar checking,
   and local data fallback for offline support.
   ========================================================================== */

import showModal from "./showModal.js";
import { authState } from "./auth.js";

// Use global objects from CDN
const Quill = window.Quill;
const DOMPurify = window.DOMPurify;
const Typo = window.Typo;
const nlp = window.nlp;

/* ==========================================================================
   Configuration
   Defines API settings, timeouts, and polling intervals for initialization.
   ========================================================================== */
const API_CONFIG = {
  baseUrl: window.config?.API_BASE_URL || "http://localhost:3000",
  defaultTimeout: 8000,
  maxRetries: 2,
  retryDelay: 1000,
  initTimeout: 10000, // 10s timeout for DOM polling
  pollInterval: 500, // Poll every 500ms
  localDataPath: "./assets/js/modules/blog-data.json", // Local fallback data
};

/* ==========================================================================
   DOM Elements
   References to key DOM elements for blog grid, form, and buttons.
   ========================================================================== */
let blogGrid = document.getElementById("blog-grid");
let createBlogBtn = document.getElementById("create-blog-btn");
let blogFormContainer = document.getElementById("blog-form-container");
let blogForm = document.getElementById("blog-form");
let cancelBlogBtn = document.getElementById("cancel-blog");
let quillEditor = null;
const dictionary = new Typo("en_US");

// //console.log("Initial DOM elements:", {
//   blogGrid,
//   createBlogBtn,
//   blogFormContainer,
//   blogForm,
//   cancelBlogBtn,
//   authState,
// });

/* ==========================================================================
   Spell Checker Module
   Custom Quill module for real-time spell and grammar checking.
   ========================================================================== */
class SpellChecker {
  constructor(quill, options) {
    this.quill = quill;
    this.container = quill.container;
    this.checkText = this.checkText.bind(this);
    quill.on("text-change", this.checkText);
  }

  checkText() {
    const text = this.quill.getText();
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const doc = nlp(text);

    // Clear previous highlights
    this.quill.formatText(0, text.length, {
      "spell-error": false,
      "grammar-error": false,
    });

    // Spell checking
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, "");
      if (cleanWord && !dictionary.check(cleanWord)) {
        const wordIndex = text.indexOf(
          word,
          index > 0
            ? text.indexOf(words[index - 1]) + words[index - 1].length
            : 0
        );
        this.quill.formatText(wordIndex, word.length, { "spell-error": true });
      }
    });

    // Basic grammar checking (e.g., subject-verb agreement)
    const sentences = doc.sentences().data();
    sentences.forEach((sentence, sentIndex) => {
      const verbs = nlp(sentence.text).verbs().data();
      verbs.forEach((verb) => {
        if (
          verb.conjugation &&
          verb.conjugation.includes("Singular") &&
          sentence.subject &&
          sentence.subject.number === "Plural"
        ) {
          const verbIndex = text.indexOf(
            verb.text,
            sentIndex > 0
              ? text.indexOf(sentences[sentIndex - 1].text) +
                  sentences[sentIndex - 1].text.length
              : 0
          );
          this.quill.formatText(verbIndex, verb.text.length, {
            "grammar-error": true,
          });
        }
      });
    });
  }
}

/* ==========================================================================
   Quill Format Registration
   Registers custom formats for spell and grammar error highlighting.
   ========================================================================== */
Quill.register("modules/spellChecker", SpellChecker);
Quill.register(
  "formats/spell-error",
  class extends Quill.import("blots/inline") {
    static create() {
      const node = super.create();
      node.setAttribute("class", "spell-error");
      return node;
    }
  }
);
Quill.register(
  "formats/grammar-error",
  class extends Quill.import("blots/inline") {
    static create() {
      const node = super.create();
      node.setAttribute("class", "grammar-error");
      return node;
    }
  }
);

/* ==========================================================================
   Quill Editor Initialization
   Sets up the Quill editor with spell checking and custom toolbar.
   ========================================================================== */
function initializeQuill() {
  if (quillEditor) return;
  //console.log("Initializing Quill...");
  const editorElement = document.querySelector("#blog-content-editor");
  if (!editorElement) {
    //console.error("blog-content-editor not found");
    return;
  }
  quillEditor = new Quill("#blog-content-editor", {
    theme: "snow",
    modules: {
      toolbar: [
        [
          {
            font: [
              "serif",
              "sans-serif",
              "monospace",
              "Arial",
              "Times New Roman",
            ],
          },
        ],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", { underline: ["solid", "dashed", "dotted"] }],
        [{ color: [] }, { background: [] }],
        ["clean"],
      ],
      spellChecker: true,
    },
    placeholder: "Write your blog content here...",
  });

  // Enable browser spellcheck
  const quillEditorDiv = document.querySelector(".ql-editor");
  quillEditorDiv.setAttribute("spellcheck", "true");

  // Add tooltip for suggestions
  quillEditorDiv.addEventListener("mouseover", (event) => {
    if (
      event.target.classList.contains("spell-error") ||
      event.target.classList.contains("grammar-error")
    ) {
      const word = event.target.textContent;
      const cleanWord = word.replace(/[^a-zA-Z]/g, "");
      let suggestions = [];
      if (event.target.classList.contains("spell-error")) {
        suggestions = dictionary.suggest(cleanWord).slice(0, 5);
      } else {
        suggestions = ["Check grammar manually or use Grammarly"];
      }

      const tooltip = document.createElement("div");
      tooltip.className = "suggestion-tooltip";
      tooltip.innerHTML = suggestions.length
        ? suggestions
            .map((s) => `<div class="suggestion-item">${s}</div>`)
            .join("")
        : "<div>No suggestions available</div>";
      document.body.appendChild(tooltip);

      const rect = event.target.getBoundingClientRect();
      tooltip.style.position = "absolute";
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 5}px`;

      event.target.addEventListener("mouseout", () => tooltip.remove(), {
        once: true,
      });
      tooltip.addEventListener("click", (e) => {
        if (e.target.classList.contains("suggestion-item")) {
          const range = quillEditor.getSelection() || { index: 0, length: 0 };
          const wordIndex = quillEditor
            .getText()
            .indexOf(word, range.index - word.length);
          quillEditor.deleteText(wordIndex, word.length);
          quillEditor.insertText(wordIndex, e.target.textContent);
          tooltip.remove();
        }
      });
    }
  });
}

/* ==========================================================================
   Blog Loading
   Fetches blog posts from the server or falls back to local data if server fails.
   ========================================================================== */
async function loadBlogs() {
  //console.log("Loading blogs...");
  for (let attempt = 1; attempt <= API_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/blogs`, {
        signal: AbortSignal.timeout(API_CONFIG.defaultTimeout),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const blogs = await response.json();
      //console.log("Blogs fetched from server:", blogs);
      renderBlogs(blogs);
      return;
    } catch (error) {
      //console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === API_CONFIG.maxRetries) {
        // //console.warn("Server fetch failed, attempting local data fallback...");
        try {
          const localResponse = await fetch(API_CONFIG.localDataPath);
          if (!localResponse.ok) {
            // throw new Error(`Local data fetch failed: ${localResponse.status}`);
          }
          const localBlogs = await localResponse.json();
          // //console.log("Blogs fetched from local data:", localBlogs);
          renderBlogs(localBlogs);
          // showModal("Loaded local blog data due to server unavailability");
          return;
        } catch (localError) {
          // //console.error("Local data fetch failed:", localError);
          // showModal("Failed to load blogs from server or local data", true);
        }
      } else {
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.retryDelay)
        );
      }
    }
  }
}

/* ==========================================================================
   Blog Rendering
   Renders blog posts in the grid with show more/less, edit, and delete options.
   ========================================================================== */
function renderBlogs(blogs) {
  //console.log("Rendering blogs:", blogs);
  if (!blogGrid) {
    //console.error("blogGrid element not found");
    return;
  }
  blogGrid.innerHTML = "";
  blogs.forEach((blog) => {
    const blogCard = document.createElement("div");
    blogCard.className = "blog-card";
    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.content, "text/html");
    const textContent = doc.body.textContent || "";
    const truncatedContent = textContent.substring(0, 100);
    const isTruncated = textContent.length > 100;

    blogCard.innerHTML = `
      <h3>${blog.title}</h3>
      <div class="blog-content" data-full-content="${encodeURIComponent(blog.content)}">
        ${DOMPurify.sanitize(isTruncated ? blog.content.substring(0, 100) + "..." : blog.content)}
      </div>
      <p><em>By ${blog.author} on ${new Date(blog.created_at).toLocaleDateString()}</em></p>
      ${
        isTruncated
          ? `
        <button class="show-more-btn" data-id="${blog.id}">Show More</button>
        <button class="show-less-btn" data-id="${blog.id}" style="display: none;">Show Less</button>
      `
          : ""
      }
      ${
        authState.user && authState.user.role === "admin"
          ? `
        <button class="edit-blog" data-id="${blog.id}">Edit</button>
        <button class="delete-blog" data-id="${blog.id}">Delete</button>
      `
          : ""
      }
    `;
    blogGrid.appendChild(blogCard);
  });

  // Add event listeners for show more/less buttons
  document.querySelectorAll(".show-more-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const blogId = btn.dataset.id;
      const blogCard = btn.closest(".blog-card");
      const contentDiv = blogCard.querySelector(".blog-content");
      const fullContent = decodeURIComponent(contentDiv.dataset.fullContent);
      contentDiv.innerHTML = DOMPurify.sanitize(fullContent);
      btn.style.display = "none";
      blogCard.querySelector(".show-less-btn").style.display = "inline-block";
    });
  });

  document.querySelectorAll(".show-less-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const blogId = btn.dataset.id;
      const blogCard = btn.closest(".blog-card");
      const contentDiv = blogCard.querySelector(".blog-content");
      const fullContent = decodeURIComponent(contentDiv.dataset.fullContent);
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullContent, "text/html");
      const textContent = doc.body.textContent || "";
      contentDiv.innerHTML = DOMPurify.sanitize(
        textContent.substring(0, 100) + "..."
      );
      btn.style.display = "none";
      blogCard.querySelector(".show-more-btn").style.display = "inline-block";
    });
  });

  // Add event listeners for edit and delete buttons
  document.querySelectorAll(".edit-blog").forEach((btn) => {
    btn.addEventListener("click", () => editBlog(btn.dataset.id));
  });
  document.querySelectorAll(".delete-blog").forEach((btn) => {
    btn.addEventListener("click", () => deleteBlog(btn.dataset.id));
  });
}

/* ==========================================================================
   Blog Form Submission
   Handles creating or updating blog posts via form submission.
   ========================================================================== */
async function handleBlogSubmit(event) {
  event.preventDefault();
  const title = document.getElementById("blog-title").value;
  const content = quillEditor.root.innerHTML;

  if (!title || !content || content === "<p><br></p>") {
    showModal("Title and content are required", true);
    return;
  }

  try {
    const blogId = blogForm.dataset.blogId;
    const method = blogId ? "PUT" : "POST";
    const url = blogId
      ? `${API_CONFIG.baseUrl}/api/blogs/${blogId}`
      : `${API_CONFIG.baseUrl}/api/blogs`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authState.token}`,
      },
      body: JSON.stringify({ title, content }),
    });

    if (response.ok) {
      blogFormContainer.style.display = "none";
      blogForm.reset();
      quillEditor.setContents([]);
      delete blogForm.dataset.blogId;
      loadBlogs();
      showModal(
        blogId ? "Blog updated successfully" : "Blog created successfully"
      );
    } else {
      const error = await response.json();
      showModal(error.error || "Failed to save blog", true);
    }
  } catch (error) {
    //console.error("Error saving blog:", error);
    showModal("Failed to save blog", true);
  }
}

/* ==========================================================================
   Blog Editing
   Loads a blog post for editing in the Quill editor.
   ========================================================================== */
async function editBlog(blogId) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/blogs/${blogId}`);
    const blog = await response.json();
    document.getElementById("blog-title").value = blog.title;
    quillEditor.clipboard.dangerouslyPasteHTML(blog.content);
    blogForm.dataset.blogId = blogId;
    blogFormContainer.style.display = "block";
  } catch (error) {
    //console.error("Error loading blog for edit:", error);
    showModal("Failed to load blog", true);
  }
}

/* ==========================================================================
   Blog Deletion
   Deletes a blog post after user confirmation.
   ========================================================================== */
async function deleteBlog(blogId) {
  if (confirm("Are you sure you want to delete this blog post?")) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/blogs/${blogId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authState.token}` },
        }
      );
      if (response.ok) {
        loadBlogs();
        showModal("Blog deleted successfully");
      } else {
        const error = await response.json();
        showModal(error.error || "Failed to delete blog", true);
      }
    } catch (error) {
      //console.error("Error deleting blog:", error);
      showModal("Failed to delete blog", true);
    }
  }
}

/* ==========================================================================
   Module Initialization
   Initializes the blog module, including Quill, blog loading, and event listeners.
   ========================================================================== */
async function initializeBlog() {
  //console.log("Attempting to initialize blog module...");
  const startTime = Date.now();
  let initialized = false;

  const checkDOM = () => {
    blogGrid = document.getElementById("blog-grid");
    createBlogBtn = document.getElementById("create-blog-btn");
    blogFormContainer = document.getElementById("blog-form-container");
    blogForm = document.getElementById("blog-form");
    cancelBlogBtn = document.getElementById("cancel-blog");

    // //console.log("Checking DOM elements:", {
    //   blogGrid,
    //   createBlogBtn,
    //   blogFormContainer,
    //   blogForm,
    //   cancelBlogBtn,
    //   authState,
    // });

    return (
      blogGrid &&
      createBlogBtn &&
      blogFormContainer &&
      blogForm &&
      cancelBlogBtn
    );
  };

  // Poll for DOM elements
  while (Date.now() - startTime < API_CONFIG.initTimeout) {
    if (checkDOM()) {
      //console.log("All DOM elements found, initializing...");
      initialized = true;
      break;
    }
    // //console.warn(
    //   "Some DOM elements missing, retrying in",
    //   API_CONFIG.pollInterval,
    //   "ms..."
    // );
    await new Promise((resolve) =>
      setTimeout(resolve, API_CONFIG.pollInterval)
    );
  }

  if (!initialized) {
    // //console.error(
    //   "Initialization failed: DOM elements not found after timeout"
    // );
    showModal("Failed to initialize blog module", true);
    return;
  }

  // Initialize Quill and load blogs
  initializeQuill();
  loadBlogs();

  // Add event listeners
  createBlogBtn.addEventListener("click", () => {
    //console.log("Create Blog button clicked, authState:", authState);
    blogForm.reset();
    if (quillEditor) {
      quillEditor.setContents([]);
    }
    delete blogForm.dataset.blogId;
    blogFormContainer.style.display = "block";
  });

  cancelBlogBtn.addEventListener("click", () => {
    //console.log("Cancel button clicked");
    blogFormContainer.style.display = "none";
    blogForm.reset();
    if (quillEditor) {
      quillEditor.setContents([]);
    }
    delete blogForm.dataset.blogId;
  });

  blogForm.addEventListener("submit", handleBlogSubmit);

  // Check admin controls visibility
  const adminControls = document.getElementById("admin-controls");
  if (authState.user && authState.user.role === "admin") {
    //console.log("User is admin, showing admin controls");
    adminControls.style.display = "block";
  } else {
    //console.log("User is not admin, hiding admin controls");
    adminControls.style.display = "none";
  }
}

/* ==========================================================================
   Event Listeners
   Sets up listeners for DOM content loading, SPA route changes, and fallback init.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  //console.log("DOMContentLoaded fired");
  initializeBlog();
});

// Handle SPA route changes (e.g., #blog)
window.addEventListener("hashchange", () => {
  //console.log("Hash changed to:", window.location.hash);
  if (window.location.hash === "#blog") {
    initializeBlog();
  }
});

// Fallback: Try initializing after a short delay
setTimeout(() => {
  //console.log("Fallback initialization attempt");
  initializeBlog();
}, 2000);
