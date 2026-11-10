const MENU = [
  { id: "coca-cola", name: "Coca-Cola lata 350 ml", description: "Refrigerante em lata.", price: 6, category: "Bebidas", emoji: "🥤", tone: "rose" },
  { id: "coca-zero", name: "Coca-Cola Zero lata 350 ml", description: "Refrigerante sem açúcar em lata.", price: 6, category: "Bebidas", emoji: "🥤", tone: "green" },
  { id: "guarana", name: "Guaraná Antarctica lata 350 ml", description: "Refrigerante em lata.", price: 6, category: "Bebidas", emoji: "🥤", tone: "yellow" },
  { id: "suco-uva", name: "Suco Del Valle de uva lata", description: "Suco de uva em lata.", price: 8, category: "Bebidas", emoji: "🧃", tone: "rose" },
  { id: "agua", name: "Água", description: "Água mineral.", price: 5, category: "Bebidas", emoji: "💧", tone: "green" },
  { id: "chopp-vinho-400", name: "Chopp vinho 400 ml", description: "Chopp de vinho, servido bem gelado.", price: 13, category: "Chopp", emoji: "🍷", tone: "rose" },
  { id: "chopp-pilsen-400", name: "Chopp Pilsen 400 ml", description: "Chopp Pilsen, servido bem gelado.", price: 10, category: "Chopp", emoji: "🍺", tone: "yellow" },
  { id: "chopp-vinho-caneca", name: "Chopp vinho caneca gelada 330 ml", description: "Chopp de vinho em caneca gelada.", price: 13, category: "Chopp", emoji: "🍷", tone: "rose" },
  { id: "chopp-pilsen-caneca", name: "Chopp Pilsen caneca gelada 330 ml", description: "Chopp Pilsen em caneca gelada.", price: 10, category: "Chopp", emoji: "🍺", tone: "green" },
  { id: "dose-jack-daniels", name: "Dose de Jack Daniel's", description: "Dose de Jack Daniel's.", price: 30, category: "Doses", emoji: "🥃", tone: "yellow" },
  { id: "dose-smirnoff", name: "Dose de Smirnoff", description: "Dose de Smirnoff.", price: 20, category: "Doses", emoji: "🍸", tone: "green" },
  { id: "dose-red-label", name: "Dose de Red Label", description: "Dose de Red Label.", price: 20, category: "Doses", emoji: "🥃", tone: "rose" },
  { id: "torcidas", name: "Torcidas", description: "Salgadinho Torcidas.", price: 5, category: "Aperitivos", emoji: "🥨", tone: "yellow" },
  { id: "azeitonas", name: "Azeitonas", description: "Porção de azeitonas.", price: 15, category: "Aperitivos", emoji: "🍽️", tone: "green" },
  { id: "mandioca", name: "Mandioca", description: "Porção de mandioca.", price: 10, category: "Porções", emoji: "🍟", tone: "yellow" },
  { id: "torresmo-mandioca", name: "Torresmo / mandioca", description: "Porção de torresmo com mandioca.", price: 37, category: "Porções", emoji: "🥓", tone: "rose" },
  { id: "calabresa", name: "Porção de calabresa", description: "Porção de calabresa.", price: 33, category: "Porções", emoji: "🍽️", tone: "green" }
];
const POLL_INTERVAL_MS = 5000;
const CATEGORIES = ["Todos", "Chopp", "Porções", "Aperitivos", "Doses", "Bebidas"];
const STATUS = {
  novo: { label: "Novo", action: "Começar preparo", next: "preparando", nextLabel: "Marcar como preparando" },
  preparando: { label: "Preparando", action: "Marcar como pronto", next: "pronto", nextLabel: "Marcar como pronto" },
  pronto: { label: "Pronto", action: "Confirmar entrega", next: "entregue", nextLabel: "Confirmar entrega" },
  entregue: { label: "Entregue", action: "Pedido entregue", next: null, nextLabel: null }
};

const state = { category: "Todos", cart: new Map(), kitchenFilter: "Ativos", orders: [] };
let kitchenAuthenticated = false;
let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = 0;
let refreshingOrders = false;
let submittingOrder = false;
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function supabaseConfig() {
  const config = window.SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey) {
    throw new Error("Configure a URL e a chave pública do Supabase no arquivo supabase-config.js.");
  }
  return { url: config.url.replace(/\/+$/, ""), anonKey: config.anonKey };
}

async function supabaseRequest(path, { method = "GET", body, token, prefer } = {}) {
  const config = supabaseConfig();
  let authToken = token;
  if (token && token === accessToken && refreshToken && Date.now() >= tokenExpiresAt - 60000) {
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const session = await response.json();
    if (!response.ok) throw new Error(session.error_description || session.msg || "A sessão da cozinha expirou. Entre novamente.");
    accessToken = session.access_token;
    refreshToken = session.refresh_token;
    tokenExpiresAt = Date.now() + Number(session.expires_in) * 1000;
    authToken = accessToken;
  }
  const headers = {
    apikey: config.anonKey,
    Authorization: `Bearer ${authToken || config.anonKey}`
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${config.url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    let detail = "";
    try {
      const error = await response.json();
      detail = error.message || error.msg || error.error_description || "";
    } catch (error) {
      console.error("Não foi possível interpretar o erro retornado pelo Supabase.", error);
    }
    throw new Error(detail || `O Supabase respondeu com o erro ${response.status}.`);
  }
  const result = await response.text();
  return result ? JSON.parse(result) : null;
}

function currentView() {
  return new URLSearchParams(location.search).get("view") === "kitchen" ? "kitchen" : "order";
}

function setView(view) {
  const url = new URL(location.href);
  if (view === "kitchen") url.searchParams.set("view", "kitchen");
  else url.searchParams.delete("view");
  history.pushState({}, "", url);
  renderView();
}

function renderView() {
  const kitchenRequested = currentView() === "kitchen";
  const kitchen = kitchenRequested && kitchenAuthenticated;
  document.getElementById("order-view").hidden = kitchen;
  document.getElementById("kitchen-view").hidden = !kitchen;
  document.getElementById("switch-label").textContent = kitchen ? "Voltar aos pedidos" : "Painel da cozinha";
  document.getElementById("view-switch").setAttribute("aria-label", kitchen ? "Voltar para pedidos" : "Abrir painel da cozinha");
  if (kitchen) renderKitchen();
  if (kitchenRequested && !kitchenAuthenticated) openKitchenPassword();
  else document.getElementById("kitchen-password-modal").hidden = true;
}

function openKitchenPassword() {
  const modal = document.getElementById("kitchen-password-modal");
  modal.hidden = false;
  document.getElementById("kitchen-password-error").hidden = true;
  document.getElementById("kitchen-password").value = "";
  document.getElementById("kitchen-password").focus();
}

function closeKitchenPassword() {
  document.getElementById("kitchen-password-modal").hidden = true;
  document.getElementById("kitchen-password").value = "";
  if (currentView() === "kitchen") {
    const url = new URL(location.href);
    url.searchParams.delete("view");
    history.replaceState({}, "", url);
  }
  renderView();
}

function renderTables() {
  const selector = document.getElementById("table-number");
  const requested = Number(new URLSearchParams(location.search).get("mesa"));
  selector.innerHTML = Array.from({ length: 20 }, (_, index) => {
    const table = index + 1;
    return `<option value="${table}" ${table === (requested >= 1 && requested <= 20 ? requested : 1) ? "selected" : ""}>Mesa ${String(table).padStart(2, "0")}</option>`;
  }).join("");
}

function renderCategories() {
  document.getElementById("categories").innerHTML = CATEGORIES.map((category) =>
    `<button class="category-button ${state.category === category ? "active" : ""}" type="button" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`
  ).join("");
}

function renderMenu() {
  const items = state.category === "Todos" ? MENU : MENU.filter((item) => item.category === state.category);
  document.getElementById("menu-grid").innerHTML = items.map((item) => `
    <article class="menu-card">
      <div class="food-art ${item.tone}" aria-hidden="true">${item.emoji}</div>
      <div class="food-info"><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description)}</p><span class="food-price">${money(item.price)}</span></div>
      <button class="add-button" type="button" data-add="${item.id}" aria-label="Adicionar ${escapeHTML(item.name)}">+</button>
    </article>`).join("");
}

function renderCart() {
  const entries = [...state.cart.entries()];
  const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [id, quantity]) => sum + MENU.find((item) => item.id === id).price * quantity, 0);
  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-total").textContent = money(total);
  document.getElementById("cart-empty").hidden = count > 0;
  document.getElementById("cart-items").innerHTML = entries.map(([id, quantity]) => {
    const item = MENU.find((menuItem) => menuItem.id === id);
    return `<div class="cart-item">
      <span class="cart-item-name">${escapeHTML(item.name)}</span><span class="cart-item-price">${money(item.price * quantity)}</span>
      <div class="quantity-control"><button type="button" data-quantity="-1" data-id="${item.id}" aria-label="Remover um ${escapeHTML(item.name)}">−</button><span>${quantity}</span><button type="button" data-quantity="1" data-id="${item.id}" aria-label="Adicionar um ${escapeHTML(item.name)}">+</button></div>
    </div>`;
  }).join("");
  document.getElementById("checkout-button").disabled = count === 0;
}

function setOrderFormDisabled(disabled) {
  document.querySelectorAll("#order-view button:not(#checkout-button), #order-view select, #order-view textarea")
    .forEach((control) => { control.disabled = disabled; });
}

function renderKitchen() {
  const counts = {
    total: state.orders.filter((order) => order.status !== "entregue").length,
    novo: state.orders.filter((order) => order.status === "novo").length,
    preparando: state.orders.filter((order) => order.status === "preparando").length,
    pronto: state.orders.filter((order) => order.status === "pronto").length
  };
  document.getElementById("kitchen-summary").innerHTML = [
    ["Em andamento", counts.total, ""], ["Novos", counts.novo, "new"],
    ["Preparando", counts.preparando, "preparing"], ["Prontos", counts.pronto, "ready"]
  ].map(([label, count, tone]) => `<div class="summary-card ${tone}"><span>${label.toUpperCase()}</span><strong>${count}</strong></div>`).join("");

  const filters = ["Ativos", "Novos", "Preparando", "Prontos", "Entregues"];
  document.getElementById("board-filters").innerHTML = filters.map((filter) =>
    `<button class="filter-button ${state.kitchenFilter === filter ? "active" : ""}" type="button" data-filter="${filter}">${filter}</button>`
  ).join("");
  const filtered = state.orders.filter((order) => {
    if (state.kitchenFilter === "Ativos") return order.status !== "entregue";
    return STATUS[order.status].label === state.kitchenFilter;
  }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  document.getElementById("orders-board").innerHTML = filtered.length ? filtered.map(renderOrder).join("") :
    `<div class="board-empty"><span>✳</span><strong>Nenhum pedido por aqui.</strong><p>Os pedidos novos aparecem nesta tela assim que forem enviados.</p></div>`;
}

function renderOrder(order) {
  const status = STATUS[order.status];
  const createdAt = new Date(order.createdAt);
  const time = Number.isNaN(createdAt.getTime()) ? "Horário indisponível" : createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const displayId = order.id.slice(0, 8).toUpperCase();
  const lines = order.items.map((item) => `<div class="order-line"><span>${item.quantity}× ${escapeHTML(item.name)}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join("");
  return `<article class="order-card">
    <header class="order-card-head"><div><span class="order-code">#${escapeHTML(displayId)}</span><span class="order-time">Recebido às ${time}</span></div><div style="text-align:right"><span class="table-badge">MESA ${escapeHTML(order.table)}</span><br /><span class="status-label status-${order.status}">${status.label}</span></div></header>
    <div class="order-lines">${lines}</div>
    ${order.note ? `<p class="order-note"><strong>Obs.:</strong> ${escapeHTML(order.note)}</p>` : ""}
    <footer class="order-card-foot"><div class="order-card-total"><span>Total do pedido</span><strong>${money(order.total)}</strong></div>
      <button class="status-action ${order.status === "entregue" ? "complete" : ""}" type="button" data-order="${escapeHTML(order.id)}" ${status.next ? "" : "disabled"}><span>${status.next ? status.nextLabel : "Pedido finalizado"}</span><span>→</span></button>
    </footer>
  </article>`;
}

function addToCart(id) {
  state.cart.set(id, (state.cart.get(id) || 0) + 1);
  renderCart();
  const item = MENU.find((entry) => entry.id === id);
  showToast(`${item.name} adicionado ao pedido`);
}

function changeQuantity(id, amount) {
  const next = (state.cart.get(id) || 0) + amount;
  if (next <= 0) state.cart.delete(id);
  else state.cart.set(id, next);
  renderCart();
}

async function submitOrder() {
  if (submittingOrder) return;
  const items = [...state.cart.entries()].map(([id, quantity]) => {
    const item = MENU.find((entry) => entry.id === id);
    return { id, name: item.name, price: item.price, quantity };
  });
  if (!items.length) return;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const id = crypto.randomUUID();
  const order = {
    id,
    table_number: Number(document.getElementById("table-number").value),
    items,
    note: document.getElementById("order-note").value.trim(),
    total,
    status: "novo"
  };
  const button = document.getElementById("checkout-button");
  submittingOrder = true;
  button.disabled = true;
  setOrderFormDisabled(true);
  try {
    await supabaseRequest("/rest/v1/orders", {
      method: "POST",
      body: order,
      prefer: "return=minimal"
    });
    document.getElementById("success-order-id").textContent = `#${id.slice(0, 8).toUpperCase()}`;
    document.getElementById("success-modal").hidden = false;
    state.cart.clear();
    document.getElementById("order-note").value = "";
    renderCart();
  } catch (error) {
    console.error("Não foi possível enviar o pedido ao Supabase.", error);
    showToast(`Pedido não enviado: ${error.message}`);
  } finally {
    submittingOrder = false;
    setOrderFormDisabled(false);
    button.disabled = state.cart.size === 0;
  }
}

async function updateOrder(id) {
  const order = state.orders.find((entry) => entry.id === id);
  if (!order || !STATUS[order.status].next) return;
  try {
    await supabaseRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status: STATUS[order.status].next },
      token: accessToken,
      prefer: "return=minimal"
    });
    await refreshOrders();
  } catch (error) {
    console.error("Não foi possível atualizar o status do pedido.", error);
    showToast(`Não foi possível atualizar: ${error.message}`);
  }
}

async function refreshOrders() {
  if (!accessToken || refreshingOrders) return;
  refreshingOrders = true;
  try {
    const rows = await supabaseRequest(
      "/rest/v1/orders?select=id,table_number,items,note,total,status,created_at&order=created_at.desc",
      { token: accessToken }
    );
    state.orders = rows.map((row) => ({
      id: row.id,
      table: row.table_number,
      items: row.items,
      note: row.note,
      total: Number(row.total),
      status: row.status,
      createdAt: row.created_at
    })).filter((order) => Array.isArray(order.items) && STATUS[order.status]);
    renderKitchen();
    document.getElementById("last-updated").textContent =
      `Sincronizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · atualiza a cada 5 s`;
  } catch (error) {
    console.error("Não foi possível sincronizar os pedidos.", error);
    document.getElementById("last-updated").textContent = `Falha na sincronização: ${error.message}`;
  } finally {
    refreshingOrders = false;
  }
}

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2300);
}

document.getElementById("view-switch").addEventListener("click", () => {
  if (currentView() === "kitchen") setView("order");
  else setView("kitchen");
});
document.getElementById("kitchen-password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const errorMessage = document.getElementById("kitchen-password-error");
  errorMessage.hidden = true;
  submitButton.disabled = true;
  try {
    const config = supabaseConfig();
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: document.getElementById("kitchen-email").value.trim(),
        password: document.getElementById("kitchen-password").value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error_description || result.msg || "E-mail ou senha inválidos.");
    accessToken = result.access_token;
    refreshToken = result.refresh_token;
    tokenExpiresAt = Date.now() + Number(result.expires_in) * 1000;
    kitchenAuthenticated = true;
    document.getElementById("kitchen-password-modal").hidden = true;
    if (currentView() !== "kitchen") setView("kitchen");
    else renderView();
    await refreshOrders();
  } catch (error) {
    console.error("Não foi possível autenticar no painel da cozinha.", error);
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});
document.getElementById("kitchen-password-cancel").addEventListener("click", closeKitchenPassword);
document.getElementById("kitchen-password-modal").addEventListener("click", (event) => {
  if (event.target.id === "kitchen-password-modal") closeKitchenPassword();
});
document.getElementById("categories").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderMenu();
});
document.getElementById("menu-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});
document.getElementById("cart-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity]");
  if (button) changeQuantity(button.dataset.id, Number(button.dataset.quantity));
});
document.getElementById("checkout-button").addEventListener("click", submitOrder);
document.getElementById("board-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.kitchenFilter = button.dataset.filter;
  renderKitchen();
});
document.getElementById("orders-board").addEventListener("click", (event) => {
  const button = event.target.closest("[data-order]");
  if (button) updateOrder(button.dataset.order);
});
document.getElementById("modal-close").addEventListener("click", () => { document.getElementById("success-modal").hidden = true; });
document.getElementById("continue-button").addEventListener("click", () => { document.getElementById("success-modal").hidden = true; });
document.getElementById("success-modal").addEventListener("click", (event) => {
  if (event.target.id === "success-modal") event.currentTarget.hidden = true;
});
window.addEventListener("popstate", renderView);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.getElementById("success-modal").hidden = true;
  if (event.key === "Escape" && !document.getElementById("kitchen-password-modal").hidden) closeKitchenPassword();
});
function updateClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
updateClock();
setInterval(updateClock, 1000);
setInterval(() => {
  if (currentView() === "kitchen" && kitchenAuthenticated) refreshOrders();
}, POLL_INTERVAL_MS);

renderTables();
renderCategories();
renderMenu();
renderCart();
renderView();
