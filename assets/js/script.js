
import { videoData } from "./videoAdded.js";
import { treeData } from "./treeData.js";

const treeContainer = document.getElementById("tree-container");
const videoGrid = document.getElementById("video-grid");
let isAllExpanded = false;

// Initialize EmailJS
function initializeEmailJS() {
  if (window.config && window.config.EMAILJS_PUBLIC_KEY) {
    emailjs.init(window.config.EMAILJS_PUBLIC_KEY);
  } else {
    console.error("EmailJS public key not found in config.js");
  }
}

// Recursive function to render nodes
function renderNode(node, depth = 0) {
  const nodeElement = document.createElement("div");
  nodeElement.className = `node ${node.type}-node`;
  nodeElement.style.marginLeft = `${depth * 20}px`;
  nodeElement.tabIndex = 0;
  nodeElement.setAttribute("role", "article");
  nodeElement.setAttribute("aria-label", `${node.type}: ${node.name}`);

  const hasChildren = node.children && node.children.length > 0;

  nodeElement.innerHTML = `
    <div class="node-header">
      ${
        hasChildren
          ? `<button class="toggle-details" aria-expanded="false">
               <i class="fas fa-chevron-down"></i>
             </button>`
          : ""
      }
      <h3>${node.name}</h3>
    </div>
    <p>${node.description}</p>
    ${
      hasChildren
        ? `<div class="node-details">
             ${node.children.map((child) => renderNode(child, depth + 1)).join("")}
           </div>`
        : ""
    }
  `;

  return nodeElement.outerHTML;
}

// Render the entire tree
function renderTree() {
  treeContainer.innerHTML = renderNode(treeData);
}

renderTree();

// Toggle details for branches
treeContainer.addEventListener("click", (e) => {
  const button = e.target.closest(".toggle-details");
  if (button) {
    const details = button.parentElement.nextElementSibling.nextElementSibling;
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", !isExpanded);
    button.innerHTML = `<i class="fas fa-chevron-${isExpanded ? "down" : "up"}"></i>`;
    details.classList.toggle("active");
    updateToggleButtonText();
  }
});

// Keyboard navigation for toggle
treeContainer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    const node = e.target.closest(".node");
    if (node) {
      const toggleButton = node.querySelector(".toggle-details");
      if (toggleButton) {
        toggleButton.click();
      }
    }
  }
});

// Search functionality
document.getElementById("tree-search").addEventListener("input", (e) => {
  const search = e.target.value.toLowerCase();
  document.querySelectorAll(".node").forEach((node) => {
    const name = node.querySelector("h3").textContent.toLowerCase();
    const description = node.querySelector("p").textContent.toLowerCase();
    node.style.opacity =
      name.includes(search) || description.includes(search) ? "1" : "0.3";
  });
});

// Toggle all nodes
document.getElementById("toggle-all").addEventListener("click", () => {
  isAllExpanded = !isAllExpanded;
  document.querySelectorAll(".node").forEach((node) => {
    const button = node.querySelector(".toggle-details");
    if (button) {
      const details =
        button.parentElement.nextElementSibling.nextElementSibling;
      button.setAttribute("aria-expanded", isAllExpanded);
      button.innerHTML = `<i class="fas fa-chevron-${isAllExpanded ? "up" : "down"}"></i>`;
      details.classList.toggle("active", isAllExpanded);
    }
  });
  document.getElementById("toggle-all").textContent = isAllExpanded
    ? "Collapse All"
    : "Expand All";
  window.scrollTo({
    top: document.getElementById("image-of-life").offsetTop,
    behavior: "smooth",
  });
  document.getElementById("tree-search").value = "";
  document.querySelectorAll(".node").forEach((node) => {
    node.style.opacity = "1";
  });
});

// Update toggle button text based on node states
function updateToggleButtonText() {
  const allButtons = document.querySelectorAll(".toggle-details");
  const allExpanded = Array.from(allButtons).every(
    (btn) => btn.getAttribute("aria-expanded") === "true"
  );
  const allCollapsed = Array.from(allButtons).every(
    (btn) => btn.getAttribute("aria-expanded") === "false"
  );
  isAllExpanded = allExpanded;
  document.getElementById("toggle-all").textContent = allExpanded
    ? "Collapse All"
    : "Expand All";
}

// Function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function to render YouTube videos
function renderYouTubeVideos(data) {
  videoGrid.innerHTML = "";
  const youtubeVideoIds = [];
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      if (item.id.videoId) {
        youtubeVideoIds.push(item.id.videoId);
        const videoContainer = document.createElement("div");
        videoContainer.className = "video-container";
        videoContainer.id = `video${index + 1}`;
        const videoTitle = item.snippet.title.replace(/"/g, '"');
        videoContainer.innerHTML = `
          <iframe 
            src="https://www.youtube.com/embed/${item.id.videoId}?rel=0&modestbranding=1" 
            title="${videoTitle}"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen 
            loading="lazy"
          ></iframe>
        `;
        videoGrid.appendChild(videoContainer);
      }
    });
  } else {
    console.warn("No YouTube videos found or invalid response:", data);
    videoGrid.innerHTML = "<p>No YouTube videos available at this time.</p>";
  }
  return youtubeVideoIds;
}

// Function to render local videos
function renderLocalVideos() {
  videoGrid.innerHTML = "";
  videoData.forEach((video, index) => {
    const videoId = extractVideoId(video.url);
    if (videoId) {
      const videoContainer = document.createElement("div");
      videoContainer.className = "video-container";
      videoContainer.id = `local-video${index + 1}`;
      const videoTitle = video.title.replace(/"/g, '"');
      videoContainer.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" 
          title="${videoTitle}"
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen 
          loading="lazy"
        ></iframe>
      `;
      videoGrid.appendChild(videoContainer);
    }
  });
}

// Function to render both YouTube and local videos
function renderBothVideos(youtubeData, localVideos) {
  videoGrid.innerHTML = "";
  // Render YouTube videos
  if (youtubeData.items && Array.isArray(youtubeData.items)) {
    youtubeData.items.forEach((item, index) => {
      if (item.id.videoId) {
        const videoContainer = document.createElement("div");
        videoContainer.className = "video-container";
        videoContainer.id = `video${index + 1}`;
        const videoTitle = item.snippet.title.replace(/"/g, '"');
        videoContainer.innerHTML = `
          <iframe 
            src="https://www.youtube.com/embed/${item.id.videoId}?rel=0&modestbranding=1" 
            title="${videoTitle}"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen 
            loading="lazy"
          ></iframe>
        `;
        videoGrid.appendChild(videoContainer);
      }
    });
  }
  // Render local videos
  localVideos.forEach((video, index) => {
    const videoId = extractVideoId(video.url);
    if (videoId) {
      const videoContainer = document.createElement("div");
      videoContainer.className = "video-container";
      videoContainer.id = `local-video${index + 1}`;
      const videoTitle = video.title.replace(/"/g, '"');
      videoContainer.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" 
          title="${videoTitle}"
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen 
          loading="lazy"
        ></iframe>
      `;
      videoGrid.appendChild(videoContainer);
    }
  });
}

// YouTube API Integration
function fetchYouTubeVideos() {
  // Validate configuration
  if (
    !window.config ||
    !window.config.YOUTUBE_API_KEY ||
    !window.config.CHANNEL_ID
  ) {
    console.error("YouTube API key or channel ID not found in config.js");
    renderLocalVideos(); // Fallback to local videos if config is missing
    return;
  }

  // Check cache
  const cacheKey = "youtube_videos";
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTime = localStorage.getItem("youtube_videos_time");
  const cacheDuration = 60 * 60 * 1000; // 1 hour

  if (cachedData && cacheTime && Date.now() - cacheTime < cacheDuration) {
    const data = JSON.parse(cachedData);
    handleVideoRendering(data);
    return;
  }

  // Fetch videos from YouTube API
  fetch(
    `https://www.googleapis.com/youtube/v3/search?key=${window.config.YOUTUBE_API_KEY}&channelId=${window.config.CHANNEL_ID}&part=snippet,id&order=date&maxResults=4`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem("youtube_videos_time", Date.now());
      handleVideoRendering(data);
    })
    .catch((error) => {
      console.error("Error fetching YouTube videos:", error);
      renderLocalVideos(); // Fallback to local videos on fetch failure
    });
}

// Function to handle video rendering logic
function handleVideoRendering(youtubeData) {
  // Extract YouTube video IDs
  const youtubeVideoIds = youtubeData.items
    ? youtubeData.items
        .filter((item) => item.id.videoId)
        .map((item) => item.id.videoId)
    : [];
  // Extract local video IDs
  const localVideoIds = videoData
    .map((video) => extractVideoId(video.url))
    .filter((id) => id);

  // Check if YouTube videos are the same as local videos
  const areVideosDifferent =
    youtubeVideoIds.length !== localVideoIds.length ||
    youtubeVideoIds.some((id) => !localVideoIds.includes(id)) ||
    localVideoIds.some((id) => !youtubeVideoIds.includes(id));

  if (youtubeVideoIds.length === 0) {
    // If no YouTube videos, render local videos
    renderLocalVideos();
  } else if (areVideosDifferent) {
    // If videos are different, render both
    renderBothVideos(youtubeData, videoData);
  } else {
    // If videos are the same, render only YouTube videos
    renderYouTubeVideos(youtubeData);
  }
}

// Initialize video fetching
fetchYouTubeVideos();

// EmailJS Form Submission
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  if (
    !window.config ||
    !window.config.EMAILJS_SERVICE_ID ||
    !window.config.EMAILJS_TEMPLATE_ID
  ) {
    console.error("EmailJS configuration not found in config.js");
    alert("Failed to send message. Configuration error.");
    return;
  }
  emailjs
    .sendForm(
      window.config.EMAILJS_SERVICE_ID,
      window.config.EMAILJS_TEMPLATE_ID,
      form
    )
    .then(
      () => {
        alert("Message sent successfully!");
        form.reset();
      },
      (error) => {
        console.error("EmailJS Error:", error);
        alert("Failed to send message. Please try again.");
      }
    );
});

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

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeEmailJS();
  fetchYouTubeVideos();
});

// Form Handling
document.addEventListener('DOMContentLoaded', function() {
  const subjectSelect = document.getElementById('subject-select');
  const childrenForm = document.getElementById('children-registration');
  const contactForm = document.getElementById('contact-form');
  const countrySelect = document.getElementById('country');
  const stateGroup = document.getElementById('state-group');
  const stateSelect = document.getElementById('state');
  
  // US States for dropdown
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    // Add all other states...
  ];
  
  // Show/hide children registration form based on selection
  subjectSelect.addEventListener('change', function() {
    if (this.value === 'children-life') {
      childrenForm.style.display = 'block';
      contactForm.style.display = 'none';
    } else {
      childrenForm.style.display = 'none';
      contactForm.style.display = 'block';
    }
  });
  
  // Show/hide state dropdown for USA
  countrySelect.addEventListener('change', function() {
    if (this.value === 'USA') {
      stateGroup.style.display = 'block';
      stateSelect.innerHTML = '<option value="">Select State</option>' + 
        usStates.map(state => `<option value="${state}">${state}</option>`).join('');
    } else {
      stateGroup.style.display = 'none';
    }
  });
  
  // Form submission handlers
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // Handle regular contact form submission
    console.log('Contact form submitted');
    // Add your AJAX submission logic here
  });
  
  document.getElementById('children-form').addEventListener('submit', function(e) {
    e.preventDefault();
    // Handle children registration form submission
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    console.log('Children registration submitted:', data);
    
    // Send data to backend
    fetch('/api/register-child', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
      alert('Registration successful!');
      // Optionally redirect or show confirmation
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Registration failed. Please try again.');
    });
  });
});
