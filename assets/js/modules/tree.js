import { treeData } from "../treeData.js";

const treeContainer = document.getElementById("tree-container");
let isAllExpanded = false;

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

// Function to expand or collapse a node
function setNodeExpanded(node, expanded) {
  const button = node.querySelector(".toggle-details");
  if (button) {
    const details = button.parentElement.nextElementSibling.nextElementSibling;
    button.setAttribute("aria-expanded", expanded);
    button.innerHTML = `<i class="fas fa-chevron-${expanded ? "up" : "down"}"></i>`;
    details.classList.toggle("active", expanded);
  }
}

// Recursive search and expand function
function searchAndExpand(node, search) {
  const title = node.querySelector("h3")?.textContent.toLowerCase() || "";
  const desc = node.querySelector("p")?.textContent.toLowerCase() || "";
  const matches = title.includes(search) || desc.includes(search);

  const childrenContainer = node.querySelector(".node-details");
  const children = childrenContainer
    ? Array.from(childrenContainer.children)
    : [];

  let childMatches = false;
  for (const child of children) {
    const childMatch = searchAndExpand(child, search);
    if (childMatch) {
      childMatches = true;
    }
  }

  if (matches || childMatches) {
    node.style.opacity = "1";
    setNodeExpanded(node, true);
    return true;
  } else {
    node.style.opacity = "0.3";
    setNodeExpanded(node, false);
    return false;
  }
}

// Handle input search
document.getElementById("tree-search").addEventListener("input", (e) => {
  const search = e.target.value.trim().toLowerCase();

  if (search === "") {
    document.querySelectorAll(".node").forEach((node) => {
      node.style.opacity = "1";
      setNodeExpanded(node, isAllExpanded);
    });
    return;
  }

  document.querySelectorAll(".node").forEach((node) => {
    if (node.parentElement.id === "tree-container") {
      searchAndExpand(node, search);
    }
  });
});

// Handle individual node toggle
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

// Handle keyboard accessibility
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

// Handle expand/collapse all
document.getElementById("toggle-all").addEventListener("click", () => {
  isAllExpanded = !isAllExpanded;

  document.querySelectorAll(".node").forEach((node) => {
    setNodeExpanded(node, isAllExpanded);
  });

  const container = document.getElementById("tree-container");

  if (isAllExpanded) {
    container.style.transform = "scale(0.85)";
    container.style.transformOrigin = "top center";
  } else {
    container.style.transform = "scale(1)";
    container.style.transformOrigin = "top center";
  }

  setTimeout(() => {
    container.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);

  document.getElementById("toggle-all").textContent = isAllExpanded
    ? "Collapse All"
    : "Expand All";

  document.getElementById("tree-search").value = "";
  document.querySelectorAll(".node").forEach((node) => {
    node.style.opacity = "1";
  });
});

// Update toggle button text
function updateToggleButtonText() {
  const allButtons = document.querySelectorAll(".toggle-details");
  const allExpanded = Array.from(allButtons).every(
    (btn) => btn.getAttribute("aria-expanded") === "true"
  );
  isAllExpanded = allExpanded;
  document.getElementById("toggle-all").textContent = allExpanded
    ? "Collapse All"
    : "Expand All";
}
