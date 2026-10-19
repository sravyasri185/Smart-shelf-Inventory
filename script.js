const starterProducts = [
  {id:1,name:"Rice Bag",category:"Groceries",quantity:4,minimum:10,emoji:"🍚"},
  {id:2,name:"Milk Packets",category:"Dairy",quantity:0,minimum:8,emoji:"🥛"},
  {id:3,name:"Cooking Oil",category:"Groceries",quantity:18,minimum:5,emoji:"🫒"},
  {id:4,name:"Bread",category:"Bakery",quantity:3,minimum:6,emoji:"🍞"},
  {id:5,name:"Soap",category:"Personal Care",quantity:25,minimum:8,emoji:"🧼"},
  {id:6,name:"Biscuits",category:"Snacks",quantity:15,minimum:5,emoji:"🍪"},
  {id:7,name:"Orange Juice",category:"Beverages",quantity:12,minimum:5,emoji:"🧃"},
  {id:8,name:"Coffee",category:"Beverages",quantity:4,minimum:6,emoji:"☕"},
  {id:9,name:"Shampoo",category:"Personal Care",quantity:14,minimum:5,emoji:"🧴"},
  {id:10,name:"Eggs",category:"Dairy",quantity:0,minimum:10,emoji:"🥚"},
  {id:11,name:"Chips",category:"Snacks",quantity:7,minimum:5,emoji:"🍟"},
  {id:12,name:"Apples",category:"Fruits",quantity:20,minimum:6,emoji:"🍎"}
];

const STORAGE_KEY = "smartshelf_inventory_v1";
let products = loadProducts();
let page = 1;
const pageSize = 6;
let alertsExpanded = false;

const $ = id => document.getElementById(id);
const body = $("inventoryBody");
const search = $("searchInput");
const categoryFilter = $("categoryFilter");
const statusFilter = $("statusFilter");

function loadProducts() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(data)) return data;
  } catch (error) {
    console.warn("Could not load saved inventory.", error);
  }

  return starterProducts.map(product => ({ ...product }));
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    alert("Could not save in this browser. Please check browser storage settings.");
    return false;
  }
}

function status(product) {
  if (Number(product.quantity) === 0) return "out";
  if (Number(product.quantity) <= Number(product.minimum)) return "low";
  return "healthy";
}

function labelStatus(value) {
  return {
    healthy: "In Stock",
    low: "Low Stock",
    out: "Out of Stock"
  }[value];
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function updateCategories() {
  const current = categoryFilter.value;
  const categories = [...new Set(products.map(p => p.category))].sort();

  categoryFilter.innerHTML =
    '<option value="all">All Categories</option>' +
    categories.map(category =>
      `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
    ).join("");

  if (categories.includes(current)) categoryFilter.value = current;
}

function renderStats() {
  const units = products.reduce(
    (total, product) => total + Number(product.quantity), 0
  );

  const low = products.filter(product => status(product) === "low");
  const out = products.filter(product => status(product) === "out");
  const healthy = products.filter(product => status(product) === "healthy");

  $("totalProducts").textContent = products.length;
  $("totalUnits").textContent = units;
  $("lowStockCount").textContent = low.length;
  $("outOfStockCount").textContent = out.length;

  $("donutTotal").textContent = products.length;
  $("healthyLegend").textContent = healthy.length;
  $("lowLegend").textContent = low.length;
  $("outLegend").textContent = out.length;
  $("notificationCount").textContent = low.length + out.length;

  const total = Math.max(products.length, 1);
  const healthyPercent = healthy.length / total * 100;
  const lowPercent = low.length / total * 100;

  $("donut").style.background =
    `conic-gradient(#19b77c 0 ${healthyPercent}%,` +
    `#f8a640 ${healthyPercent}% ${healthyPercent + lowPercent}%,` +
    `#ef3d58 ${healthyPercent + lowPercent}% 100%)`;

  renderAlerts(low, out);
  renderCharts();
}

function renderCharts() {
  const groups = {};

  products.forEach(product => {
    groups[product.category] ??= { healthy: 0, low: 0 };

    if (status(product) === "healthy") {
      groups[product.category].healthy += Number(product.quantity);
    } else {
      groups[product.category].low += Number(product.quantity);
    }
  });

  const entries = Object.entries(groups).slice(0, 6);
  const max = Math.max(
    1,
    ...entries.flatMap(([, values]) => [values.healthy, values.low])
  );

  $("barChart").innerHTML = entries.map(([name, values]) => `
    <div class="bar-group" title="${escapeHTML(name)}">
      <div class="bar" style="height:${Math.max(2, values.healthy / max * 100)}%"></div>
      <div class="bar lowbar" style="height:${Math.max(2, values.low / max * 100)}%"></div>
      <span class="bar-label">
        ${escapeHTML(name.length > 10 ? name.slice(0, 9) + "…" : name)}
      </span>
    </div>
  `).join("") || "<p>No inventory data yet.</p>";
}

function renderAlerts(low, out) {
  const items = [
    ...out.map(product => ({ product, value: "out" })),
    ...low.map(product => ({ product, value: "low" }))
  ];

  $("alertsList").innerHTML = items.length
    ? items.slice(0, alertsExpanded ? items.length : 4).map(({product, value}) => `
        <div class="alert-row">
          <div class="alert-symbol ${value}">
            ${value === "out" ? "✕" : "⚠"}
          </div>
          <div class="alert-copy">
            <strong>${escapeHTML(product.name)}</strong>
            <p class="${value === "low" ? "low" : ""}">
              ${value === "out" ? "Out of stock" : "Low stock"} –
              ${product.quantity}
              ${product.quantity === 1 ? "unit" : "units"}
              ${value === "out" ? "left" : "remaining"}
            </p>
          </div>
          <span class="alert-time">Now</span>
        </div>
      `).join("")
    : '<div class="empty-alerts">All good! No low-stock alerts.</div>';
}

function filteredProducts() {
  const query = (search.value || $("globalSearch").value)
    .trim().toLowerCase();

  return products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter.value === "all" ||
      product.category === categoryFilter.value;

    const matchesStatus =
      statusFilter.value === "all" ||
      status(product) === statusFilter.value;

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function renderInventory() {
  const list = filteredProducts();
  const pages = Math.max(1, Math.ceil(list.length / pageSize));

  page = Math.min(page, pages);

  const shown = list.slice((page - 1) * pageSize, page * pageSize);

  body.innerHTML = shown.map(product => `
    <tr>
      <td>
        <div class="product-cell">
          <span class="product-emoji">${product.emoji || "📦"}</span>
          ${escapeHTML(product.name)}
        </div>
      </td>
      <td>${escapeHTML(product.category)}</td>
      <td class="${product.quantity === 0 ? "qty-zero" : ""}">
        ${product.quantity}
      </td>
      <td>${product.minimum}</td>
      <td>
        <span class="status ${status(product)}">
          ${labelStatus(status(product))}
        </span>
      </td>
      <td>
        <div class="actions">
          <button class="action-btn" data-action="edit" data-id="${product.id}" title="Edit product">✎</button>
          <button class="action-btn delete" data-action="delete" data-id="${product.id}" title="Delete product">♜</button>
          <button class="action-btn" data-action="decrease" data-id="${product.id}" title="Decrease stock">−</button>
          <button class="action-btn" data-action="increase" data-id="${product.id}" title="Increase stock">＋</button>
        </div>
      </td>
    </tr>
  `).join("");

  $("showingText").textContent = list.length
    ? `Showing ${Math.min((page - 1) * pageSize + 1, list.length)}–${Math.min(page * pageSize, list.length)} of ${list.length} products`
    : "No products match your search.";

  $("pageNumbers").innerHTML = Array.from(
    { length: pages },
    (_, index) => `
      <button class="page-number ${page === index + 1 ? "active" : ""}"
        data-page="${index + 1}">${index + 1}</button>
    `
  ).join("");

  $("prevPage").disabled = page === 1;
  $("nextPage").disabled = page === pages;
}

function render() {
  updateCategories();
  renderStats();
  renderInventory();
}

function emojiFor(category) {
  const value = category.toLowerCase();

  if (value.includes("dairy")) return "🥛";
  if (value.includes("bakery") || value.includes("bread")) return "🍞";
  if (value.includes("fruit")) return "🍎";
  if (value.includes("drink") || value.includes("beverage")) return "🧃";
  if (value.includes("snack")) return "🍪";
  if (value.includes("personal") || value.includes("care")) return "🧴";
  if (value.includes("grocery")) return "🛍️";

  return "📦";
}

$("productForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("productName").value.trim();
  const category = $("productCategory").value.trim();
  const quantity = Number($("productQuantity").value);
  const minimum = Number($("productMinimum").value);

  if (
    !name || !category ||
    !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000 ||
    !Number.isInteger(minimum) || minimum < 0 || minimum > 1000000
  ) {
    $("formMessage").textContent = "Please enter valid product details.";
    return;
  }

  const product = {
    id: Date.now(),
    name,
    category,
    quantity,
    minimum,
    emoji: emojiFor(category)
  };

  products.push(product);

  if (!saveProducts()) {
    products.pop();
    return;
  }

  $("productForm").reset();
  $("productQuantity").value = 10;
  $("productMinimum").value = 5;
  $("formMessage").textContent = `${name} added successfully!`;

  search.value = "";
  $("globalSearch").value = "";
  categoryFilter.value = "all";
  statusFilter.value = "all";
  page = 1;
  render();
});

body.addEventListener("click", event => {
  const button = event.target.closest("button[data-action], button[data-page]");
  if (!button) return;

  if (button.dataset.page) {
    page = Number(button.dataset.page);
    renderInventory();
    return;
  }

  const product = products.find(
    item => item.id === Number(button.dataset.id)
  );

  if (!product) return;

  const action = button.dataset.action;

  if (action === "increase") {
    if (product.quantity >= 1000000) return;
    product.quantity++;
  }

  if (action === "decrease") {
    if (product.quantity > 0) product.quantity--;
  }

  if (action === "delete") {
    if (!confirm(`Delete ${product.name} from inventory?`)) return;
    products = products.filter(item => item.id !== product.id);
  }

  if (action === "edit") {
    $("editId").value = product.id;
    $("editName").value = product.name;
    $("editCategory").value = product.category;
    $("editQuantity").value = product.quantity;
    $("editMinimum").value = product.minimum;
    $("editDialog").showModal();
    return;
  }

  saveProducts();
  render();
});

$("editForm").addEventListener("submit", event => {
  if (event.submitter?.id !== "saveEdit") return;

  event.preventDefault();

  const product = products.find(
    item => item.id === Number($("editId").value)
  );

  if (!product) return;

  product.name = $("editName").value.trim();
  product.category = $("editCategory").value.trim();
  product.quantity = Math.max(0, Number($("editQuantity").value));
  product.minimum = Math.max(0, Number($("editMinimum").value));
  product.emoji = emojiFor(product.category);

  saveProducts();
  $("editDialog").close();
  render();
});

$("prevPage").addEventListener("click", () => {
  if (page > 1) {
    page--;
    renderInventory();
  }
});

$("nextPage").addEventListener("click", () => {
  const pages = Math.max(1, Math.ceil(filteredProducts().length / pageSize));
  if (page < pages) {
    page++;
    renderInventory();
  }
});

[search, categoryFilter, statusFilter].forEach(element => {
  element.addEventListener("input", () => {
    page = 1;
    renderInventory();
  });
});

$("globalSearch").addEventListener("input", () => {
  search.value = "";
  page = 1;
  renderInventory();
});

function goView(view) {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  if (view === "add") {
    $("addSection").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (view === "inventory") {
    $("inventorySection").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (view === "reports") {
    $("chartsSection").scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (view === "settings") {
    $("settingsSection").style.display = "block";
    $("settingsSection").scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => goView(button.dataset.view));
});

$("viewAllAlerts").addEventListener("click", () => {
  alertsExpanded = !alertsExpanded;
  $("viewAllAlerts").textContent = alertsExpanded ? "Show Less" : "View All";
  renderStats();
});

$("notificationBtn").addEventListener("click", () => {
  alertsExpanded = true;
  renderStats();
  $("alertsList").scrollIntoView({ behavior: "smooth", block: "center" });
});

function resetDemo() {
  if (!confirm("Reset the demo inventory to the original sample products?")) return;

  products = starterProducts.map(product => ({ ...product }));
  saveProducts();

  page = 1;
  search.value = "";
  $("globalSearch").value = "";
  categoryFilter.value = "all";
  statusFilter.value = "all";
  $("formMessage").textContent = "";

  render();
}

$("resetBtn").addEventListener("click", resetDemo);
$("quickReset").addEventListener("click", resetDemo);

$("exportBtn").addEventListener("click", () => {
  const rows = [
    ["Product", "Category", "Quantity", "Minimum stock", "Status"],
    ...products.map(product => [
      product.name,
      product.category,
      product.quantity,
      product.minimum,
      labelStatus(status(product))
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "smartshelf-inventory.csv";
  link.click();

  URL.revokeObjectURL(url);
});

$("todayDate").textContent = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const hour = new Date().getHours();

$("greeting").textContent =
  hour < 12 ? "Good Morning! ☀️" :
  hour < 17 ? "Good Afternoon! ☀️" :
  "Good Evening! ☀️";

render();