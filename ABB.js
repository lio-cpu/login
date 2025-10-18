// Robust: waits for DOMContentLoaded, handles menu clicks & logout, and keeps inventory logic.

document.addEventListener("DOMContentLoaded", () => {
  // --- Auth guard (optional if you use login) ---
  const loggedInEmail = localStorage.getItem("loggedInUser");
  if (!loggedInEmail) {
    // window.location.href = "login.html";
  } else {
    // if you store user, show profile/welcome etc.
    try {
      const user = JSON.parse(localStorage.getItem(loggedInEmail));
      const welcome = document.getElementById("welcomeUser");
      if (welcome && user?.name) welcome.textContent = `👋 Welcome, ${user.name}!`;
      const profileInfo = document.getElementById("profileInfo");
      if (profileInfo) {
        profileInfo.innerHTML = `<p><strong>Name:</strong> ${user.name}</p><p><strong>Email:</strong> ${user.email}</p>`;
      }
    } catch (err) {
      // ignore parse errors
    }
  }

  // --- Elements & state ---
  const sidebarListItems = Array.from(document.querySelectorAll(".sidebar ul li"));
  const sections = Array.from(document.querySelectorAll(".section"));
  const inventoryTableBody = document.querySelector("#inventoryTable tbody");
  const totalItemsEl = document.getElementById("totalItems");
  const inStockEl = document.getElementById("inStock");
  const outStockEl = document.getElementById("outStock");

  const STORAGE_KEY = "clothstock_inventory_v1";
  let inventory = loadInventory();

  function loadInventory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveInventory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }

  // --- Sidebar navigation ---
  function setActiveMenuByElement(liEl) {
    sidebarListItems.forEach(i => i.classList.remove("active"));
    liEl.classList.add("active");
    const sectionId = liEl.dataset.section;
    sections.forEach(s => s.classList.remove("active"));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active");
  }

  const firstMenu = sidebarListItems.find(li => li.dataset.section);
  if (firstMenu) setActiveMenuByElement(firstMenu);

  sidebarListItems.forEach(li => {
    const anchor = li.querySelector("a.logout");
    if (anchor) {
      anchor.addEventListener("click", ev => {
        ev.preventDefault();
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.html";
      });
      return;
    }
    li.addEventListener("click", () => {
      if (!li.dataset.section) return;
      setActiveMenuByElement(li);
    });
  });

  // --- Inventory rendering ---
  function updateTableAndSummary() {
    if (!inventoryTableBody) return;
    inventoryTableBody.innerHTML = "";
    let total = 0, inStock = 0, outStock = 0;

    inventory.forEach(item => {
      total++;
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      let statusClass = "in-stock";
      let statusText = "In Stock";
      if (qty === 0) { statusClass = "out-stock"; statusText = "Out of Stock"; }
      else if (qty < 10) { statusClass = "low-stock"; statusText = "Low Stock"; }
      if (qty > 0) inStock++; else outStock++;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${qty}</td>
        <td>${price.toFixed(2)}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
      `;
      inventoryTableBody.appendChild(tr);
    });

    if (totalItemsEl) totalItemsEl.textContent = total;
    if (inStockEl) inStockEl.textContent = inStock;
    if (outStockEl) outStockEl.textContent = outStock;

    saveInventory();
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str.replace(/[&<>"'`=\/]/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;','`':'&#96;','=':'&#61;'
    })[s]);
  }

  updateTableAndSummary();

  // --- Add stock form ---
  const addStockForm = document.getElementById("addStockForm");
  if (addStockForm) {
    addStockForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = (document.getElementById("itemName")?.value || "").trim();
      const category = (document.getElementById("category")?.value || "").trim();
      const quantity = parseInt(document.getElementById("quantity")?.value, 10);
      const price = parseFloat(document.getElementById("price")?.value);
      if (!name || !category || isNaN(quantity) || quantity < 0 || isNaN(price) || price < 0) {
        alert("Please enter valid data for all fields.");
        return;
      }
      const existing = inventory.find(it => it.name.toLowerCase() === name.toLowerCase());
      if (existing) { existing.quantity += quantity; existing.price = price; }
      else inventory.push({ name, category, quantity, price });
      addStockForm.reset();
      const dashLi = sidebarListItems.find(li => li.dataset.section === "dashboard");
      if (dashLi) setActiveMenuByElement(dashLi);
      updateTableAndSummary();
    });
  }

  // --- Update sales form ---
  const salesForm = document.getElementById("salesForm");
  const saleMessage = document.getElementById("saleMessage");
  if (salesForm) {
    salesForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = (document.getElementById("saleItem")?.value || "").trim();
      const soldQty = parseInt(document.getElementById("soldQty")?.value, 10);
      if (!name || isNaN(soldQty) || soldQty <= 0) { alert("Invalid input"); return; }
      const index = inventory.findIndex(it => it.name.toLowerCase() === name.toLowerCase());
      if (index === -1) { alert("Item not found"); return; }
      if (soldQty > inventory[index].quantity) { alert("Not enough stock"); return; }
      inventory[index].quantity -= soldQty;
      salesForm.reset();
      updateTableAndSummary();
    });
  }

  // --- SALES RECORDING (Shop Name, Number, Item, Qty, Price) ---
  const salesRecordingForm = document.getElementById("salesRecordingForm");
  const salesTableBody = document.querySelector("#salesTable tbody");
  let salesRecords = [];
  if (salesRecordingForm) {
    salesRecordingForm.addEventListener("submit", e => {
      e.preventDefault();
      const shopName = (document.getElementById("shopName")?.value || "").trim();
      const shopNumber = (document.getElementById("shopNumber")?.value || "").trim();
      const soldItem = (document.getElementById("soldItem")?.value || "").trim();
      const soldQty = parseInt(document.getElementById("soldQuantity")?.value, 10);
      const soldPrice = parseFloat(document.getElementById("soldPrice")?.value);
      if (!shopName || !shopNumber || !soldItem || isNaN(soldQty) || soldQty <= 0 || isNaN(soldPrice) || soldPrice < 0) {
        alert("Please enter valid sales data.");
        return;
      }
      // Automatically get current date/time
       const dateTime = new Date().toLocaleString(); // e.g., "16/10/2025, 14:35:20"

      // Optional: automatically reduce inventory if exists
      const itemIndex = inventory.findIndex(it => it.name.toLowerCase() === soldItem.toLowerCase());
      if (itemIndex >= 0) {
        if (inventory[itemIndex].quantity >= soldQty) inventory[itemIndex].quantity -= soldQty;
        else alert("Not enough stock to reduce inventory!");
        updateTableAndSummary();
      }

       // Save sale with date
       salesRecords.push({ shopName, shopNumber, soldItem, soldQty, soldPrice, dateTime });
       updateSalesTable();
       salesRecordingForm.reset();
    });
  }

  function updateSalesTable() {
  if (!salesTableBody) return;
  salesTableBody.innerHTML = "";
  salesRecords.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.shopName)}</td>
      <td>${escapeHtml(r.shopNumber)}</td>
      <td>${escapeHtml(r.soldItem)}</td>
      <td>${r.soldQty}</td>
      <td>${r.soldPrice.toFixed(2)}</td>
      <td>${r.dateTime}</td> <!-- display automatic date -->
    `;
    salesTableBody.appendChild(tr);
  });
}

  // --- Optional: Search box in dashboard ---
  const searchBox = document.getElementById("search");
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      const q = searchBox.value.trim().toLowerCase();
      const rows = inventoryTableBody.querySelectorAll("tr");
      rows.forEach(row => {
        const name = row.children[0]?.textContent.toLowerCase() || "";
        const cat = row.children[1]?.textContent.toLowerCase() || "";
        row.style.display = (!q || name.includes(q) || cat.includes(q)) ? "" : "none";
      });
    });
  }

});
