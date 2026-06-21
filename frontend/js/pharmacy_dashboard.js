/* ===================================================================
   Medfinity — Pharmacy Dashboard: Orders, Inventory & Delivery
   A practical order / inventory / delivery management hub for
   pharmacists. Every order can be tracked through its full delivery
   lifecycle, stock can be added/restocked/removed, and low-stock
   items are surfaced prominently.
=================================================================== */

const user = requireAuth(['pharmacist']);

const ICONS = {
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  truck: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  warn: '<path d="M12 2L2 21h20L12 2z"/><path d="M12 9v5M12 17h.01"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  rupee: '<path d="M6 4h12M6 9h12M6 4c5 0 9 2.5 9 5.5S13.5 15 8.5 15H6l8 8"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const ORDER_FILTERS = [
  { key: 'active',    label: 'Active',    test: o => !['delivered', 'cancelled'].includes(o.status) },
  { key: 'pending',   label: 'Pending',   test: o => o.status === 'pending' },
  { key: 'delivery',  label: 'Out for delivery', test: o => o.status === 'out_for_delivery' || o.status === 'ready' },
  { key: 'delivered', label: 'Delivered', test: o => o.status === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', test: o => o.status === 'cancelled' },
  { key: 'all',       label: 'All orders', test: () => true },
];

let allOrders = [];
let allInventory = [];
let activeOrderFilter = 'active';

if (document.getElementById('app')){
  const firstName = escapeHtml((user.name || user.first_name || 'there').split(' ')[0]);
  const params0 = new URLSearchParams(window.location.search);
  const activeKey = params0.get('tab') === 'orders' ? 'orders' : params0.get('tab') === 'inventory' ? 'inventory' : 'dashboard';

  document.getElementById('app').innerHTML = `
    ${renderSidebar(activeKey, 'pharmacist')}
    <main class="main">
      ${renderTopbar({
        title: `${greeting()}, ${firstName} 👋`,
        sub: `${escapeHtml(user.pharmacy_name || 'Your pharmacy')} — orders, stock and deliveries in one place.`,
        user,
        hideSearch: true
      })}

      <div class="bento" id="bento" style="grid-template-columns: 1.8fr 1.1fr 1.1fr;">
        <section class="tile tile--peach hero-card">
          <h2 class="display">Every order, looked after</h2>
          <p>Track incoming prescriptions, manage stock and keep deliveries moving — all in one place.</p>
          <button class="btn btn--primary btn--lg" id="openInvBtn" style="align-self:flex-start;">${icon('pill','style="width:16px;height:16px;"')} Manage Inventory</button>
        </section>

        <section class="tile" id="statPending">
          <div class="eyebrow">Needs attention</div>
          <div class="stat__value">–</div>
          <div class="stat__label">pending orders</div>
        </section>

        <section class="tile" id="statLowStock">
          <div class="eyebrow">Stock health</div>
          <div class="stat__value">–</div>
          <div class="stat__label">items low / out of stock</div>
        </section>

        <section class="tile tile--w3" id="orderTile">
          <div class="tile__head">
            <h3>Orders &amp; Delivery Queue</h3>
            <span class="tile-link" id="orderCount"></span>
          </div>
          <div class="filter-tabs" id="orderFilters" style="margin-bottom:16px;"></div>
          <div id="orderList">${skeletonRows(4)}</div>
        </section>

        <section class="tile tile--w2" id="inventoryTile">
          <div class="tile__head">
            <h3>Inventory Snapshot</h3>
            <span class="tile-link" id="openInvBtn2" style="cursor:pointer;">Manage all →</span>
          </div>
          <div id="lowStockBanner"></div>
          <div class="list" id="inventoryList">${skeletonRows(3)}</div>
        </section>

        <section class="tile" id="searchTile">
          <div class="tile__head"><h3>Search Inventory</h3></div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 12px;">Find a medicine by name and check stock on the spot.</p>
          <div class="order-card__search">
            <input id="medicineSearch" placeholder="Search medicines…">
            <button type="button">${icon('search')}</button>
          </div>
          <div class="list" id="searchResults" style="margin-top:14px;"></div>
        </section>
      </div>
    </main>

    <!-- Manage Inventory Modal -->
    <div class="modal-overlay" id="inventoryModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:20px; overflow-y:auto;">
      <div class="tile" style="background:#fff; width:100%; max-width:780px; padding:28px; border-radius:var(--radius-lg); position:relative; max-height:90vh; overflow-y:auto;">
        <button id="closeInvModal" style="position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:var(--ink-soft);">${icon('x', 'style="width:20px;height:20px;"')}</button>
        <h3 style="margin-bottom:6px; font-size:21px; color:var(--forest-deep);">Manage Inventory</h3>
        <p style="font-size:13px; color:var(--ink-soft); margin:0 0 20px;">Add new medicines, restock existing items, or remove discontinued ones.</p>

        <div style="display:grid; grid-template-columns: 1.1fr 1.6fr; gap:24px;">
          <!-- Left: Add Medicine Form -->
          <form id="addMedForm" style="border-right: 1px solid var(--glass-border); padding-right:20px;">
            <h4 style="font-size:13.5px; margin:0 0 12px; color:var(--forest-deep); font-weight:700;">Add New Medicine</h4>
            <div class="field">
              <label for="invName">Medicine Name</label>
              <input id="invName" required placeholder="e.g. Paracetamol 650">
            </div>
            <div class="field">
              <label for="invGeneric">Generic Name</label>
              <input id="invGeneric" placeholder="e.g. Acetaminophen">
            </div>
            <div class="field-row">
              <div class="field">
                <label for="invStock">Stock Qty</label>
                <input id="invStock" type="number" min="0" required placeholder="100">
              </div>
              <div class="field">
                <label for="invPrice">Price (₹)</label>
                <input id="invPrice" type="number" min="0" step="0.01" required placeholder="10">
              </div>
            </div>
            <div class="field" style="flex-direction:row; align-items:center; gap:8px; margin-top:8px;">
              <input type="checkbox" id="invRx" style="width:auto; cursor:pointer;" checked>
              <label for="invRx" style="cursor:pointer; margin-bottom:0;">Requires Rx</label>
            </div>
            <div id="addMedError" class="form-error" style="margin-top:12px;"></div>
            <button type="submit" class="btn btn--primary btn--sm btn--block" id="addMedSubmitBtn" style="margin-top:12px;">Add to Stock</button>
          </form>

          <!-- Right: Full Inventory List -->
          <div>
            <h4 style="font-size:13.5px; margin:0 0 12px; color:var(--forest-deep); font-weight:700;">Active Stock List</h4>
            <div style="max-height:440px; overflow-y:auto;" id="modalInventoryList"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadDashboard();
  setupSearch();
  setupInventoryModal();

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'inventory') {
    setTimeout(() => document.getElementById('openInvBtn')?.click(), 300);
  } else if (tab === 'orders') {
    setTimeout(() => document.getElementById('orderTile')?.scrollIntoView({ behavior: 'smooth' }), 300);
  }
}

async function loadDashboard(){
  await Promise.all([loadOrders(), loadInventory()]);
}

/* ── Orders & Delivery ──────────────────────────────────── */
async function loadOrders(){
  const list = document.getElementById('orderList');
  try {
    const data = await PharmacyAPI.orders();
    allOrders = data.results || data;
    document.querySelector('#statPending .stat__value').textContent =
      allOrders.filter(o => o.status === 'pending').length;
    renderOrderFilters();
    renderOrders();
    checkOrderReminders(allOrders);
  } catch {
    document.querySelector('#statPending .stat__value').textContent = '—';
    list.innerHTML = emptyState("Couldn't load orders", 'Check that the backend is running.', icon('box'));
  }
}

function renderOrderFilters(){
  const wrap = document.getElementById('orderFilters');
  wrap.innerHTML = ORDER_FILTERS.map(f => {
    const n = allOrders.filter(f.test).length;
    return `<button type="button" class="filter-tab${f.key === activeOrderFilter ? ' is-active' : ''}" data-filter="${f.key}">${f.label} <span class="count">${n}</span></button>`;
  }).join('');
  wrap.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeOrderFilter = btn.dataset.filter;
      renderOrderFilters();
      renderOrders();
    });
  });
}

function renderOrders(){
  const list = document.getElementById('orderList');
  const countEl = document.getElementById('orderCount');
  const filterDef = ORDER_FILTERS.find(f => f.key === activeOrderFilter) || ORDER_FILTERS[0];
  const items = allOrders.filter(filterDef.test);
  countEl.textContent = `${allOrders.length} total order${allOrders.length !== 1 ? 's' : ''}`;

  if (!items.length){
    list.innerHTML = emptyState('No orders here', 'New prescription orders will land in this queue.', icon('box'));
    return;
  }

  list.innerHTML = items.map(o => orderRowHtml(o)).join('');

  list.querySelectorAll('[data-advance]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await PharmacyAPI.updateStatus(btn.dataset.advance, btn.dataset.next);
        showToast('Order updated', 'success');
        loadOrders();
      } catch (err){ showToast(err.message, 'error'); btn.disabled = false; }
    });
  });
  list.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this order? This cannot be undone.')) return;
      btn.disabled = true;
      try {
        await PharmacyAPI.updateStatus(btn.dataset.cancel, 'cancelled');
        showToast('Order cancelled', 'default');
        loadOrders();
      } catch (err){ showToast(err.message, 'error'); btn.disabled = false; }
    });
  });
}

function orderRowHtml(o){
  const isCancelled = o.status === 'cancelled';
  const stepIdx = STATUS_FLOW.indexOf(o.status);
  const nextIdx = stepIdx + 1;
  const next = !isCancelled ? STATUS_FLOW[nextIdx] : null;
  const items = (o.items || []).map(it => `${it.quantity}× ${escapeHtml(it.medicine_name || 'Medicine')}`).join(', ');

  const stepperHtml = isCancelled
    ? `<div class="order-track order-track--cancelled" style="opacity:.6;"><span style="font-size:12px;color:var(--danger);font-weight:700;">This order was cancelled.</span></div>`
    : `<div class="order-track">
        ${STATUS_FLOW.map((s, i) => `
          <div class="order-track__step${i < stepIdx ? ' is-done' : ''}${i === stepIdx ? ' is-current' : ''}">
            <span class="order-track__line"></span>
            <span class="order-track__dot"></span>
            <span class="order-track__label">${s.replace(/_/g,' ')}</span>
          </div>`).join('')}
      </div>`;

  return `
    <div class="order-card-row">
      <div class="order-card-row__top">
        <div>
          <div class="order-card-row__id">Order #${o.id} · ₹${o.total_amount}</div>
          <div class="order-card-row__meta">${escapeHtml(o.patient_name || 'Patient')} · ${o.delivery_type === 'delivery' ? icon('truck','style="width:12px;height:12px;display:inline;vertical-align:-2px;"') + ' Delivery' : 'Pickup'} · ${formatDate(o.created_at)}</div>
          ${items ? `<div class="order-card-row__meta" style="margin-top:4px;">${items}</div>` : ''}
        </div>
        <span class="badge badge--${o.status}" style="font-size:13px;">${o.status.replace(/_/g,' ')}</span>
      </div>
      ${stepperHtml}
      <div class="order-card-row__actions">
        ${next ? `<button class="btn btn--primary btn--sm" data-advance="${o.id}" data-next="${next}">Mark as ${next.replace(/_/g,' ')}</button>` : ''}
        ${(!isCancelled && o.status === 'pending') ? `<button class="btn btn--ghost btn--sm" data-cancel="${o.id}" style="border-color:var(--danger);color:var(--danger);">Cancel order</button>` : ''}
      </div>
    </div>`;
}

/* ── Inventory ──────────────────────────────────────────── */
async function loadInventory(){
  const list = document.getElementById('inventoryList');
  try {
    const data = await PharmacyAPI.inventory();
    allInventory = data.results || data;
    const low = allInventory.filter(i => i.stock_quantity <= 10);
    const statEl = document.querySelector('#statLowStock .stat__value');
    statEl.textContent = low.length;
    statEl.classList.toggle('stat__value--alert', low.length > 0);

    const banner = document.getElementById('lowStockBanner');
    if (low.length){
      banner.innerHTML = `<div class="alert-banner" style="margin-bottom:14px;">${icon('warn')}<span><strong>${low.length} item${low.length!==1?'s':''}</strong> running low — restock soon to avoid order delays.</span></div>`;
    } else {
      banner.innerHTML = '';
    }

    if (!allInventory.length){ list.innerHTML = emptyState('No inventory listed', 'Use "Manage Inventory" to add your first medicine.', icon('pill')); return; }
    list.innerHTML = allInventory.slice(0, 6).map(i => `
      <div class="list-row">
        <div class="list-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('pill')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(i.medicine_name)}</div>
          <div class="list-row__meta">₹${i.unit_price} · ${i.requires_prescription ? 'Rx required' : 'OTC'}</div>
        </div>
        <span class="badge ${i.stock_quantity <= 10 ? 'badge--cancelled' : 'badge--completed'}">${i.stock_quantity} left</span>
      </div>`).join('');
  } catch {
    document.querySelector('#statLowStock .stat__value').textContent = '—';
    list.innerHTML = emptyState("Couldn't load inventory", '', icon('pill'));
  }
}

function setupSearch(){
  const input = document.getElementById('medicineSearch');
  const results = document.getElementById('searchResults');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q){ results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      results.innerHTML = skeletonRows(2);
      try {
        const data = await PharmacyAPI.searchMedicines(q);
        const items = data.results || data;
        results.innerHTML = items.length ? items.map(i => `
          <div class="list-row">
            <div class="list-row__icon">${icon('search')}</div>
            <div class="list-row__body">
              <div class="list-row__title">${escapeHtml(i.medicine_name)}</div>
              <div class="list-row__meta">₹${i.unit_price} · ${i.stock_quantity} in stock</div>
            </div>
          </div>`).join('') : emptyState('No matches', '', icon('search'));
      } catch (err){
        results.innerHTML = emptyState('Search failed', err.message, icon('search'));
      }
    }, 350);
  });
}

/* ── Inventory Management Modal ─────────────────────────── */
function setupInventoryModal() {
  const modal = document.getElementById('inventoryModal');
  const closeBtn = document.getElementById('closeInvModal');
  const addForm = document.getElementById('addMedForm');

  const open = () => { modal.style.display = 'flex'; renderModalInventory(); };
  document.getElementById('openInvBtn').addEventListener('click', open);
  document.getElementById('openInvBtn2').addEventListener('click', open);

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    loadInventory();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal){ modal.style.display = 'none'; loadInventory(); } });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addMedSubmitBtn');
    const errBox = document.getElementById('addMedError');
    errBox.classList.remove('is-visible');

    const payload = {
      medicine_name: document.getElementById('invName').value.trim(),
      generic_name: document.getElementById('invGeneric').value.trim(),
      stock_quantity: parseInt(document.getElementById('invStock').value, 10) || 0,
      unit_price: parseFloat(document.getElementById('invPrice').value) || 0,
      requires_prescription: document.getElementById('invRx').checked
    };

    btn.disabled = true;
    btn.textContent = 'Adding…';

    try {
      await PharmacyAPI.addInventoryItem(payload);
      showToast('Medicine added to inventory!', 'success');
      addForm.reset();
      document.getElementById('invRx').checked = true;
      renderModalInventory();
    } catch (err) {
      errBox.textContent = err.message || 'Failed to add medicine.';
      errBox.classList.add('is-visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add to Stock';
    }
  });
}

async function renderModalInventory() {
  const listContainer = document.getElementById('modalInventoryList');
  listContainer.innerHTML = skeletonRows(3);

  try {
    const data = await PharmacyAPI.inventory();
    allInventory = data.results || data;

    if (!allInventory.length) {
      listContainer.innerHTML = '<div style="font-size:13px; color:var(--ink-soft); text-align:center; padding:20px 0;">No items in stock. Add your first medicine on the left!</div>';
      return;
    }

    listContainer.innerHTML = allInventory.map(i => `
      <div class="inv-row" data-row="${i.id}">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px; font-weight:700; color:var(--forest-deep);">${escapeHtml(i.medicine_name)}</div>
          <div style="font-size:11.5px; color:var(--ink-soft);">${escapeHtml(i.generic_name || 'No generic name')} · ${i.requires_prescription ? 'Rx' : 'OTC'}</div>
        </div>
        <input class="inv-row__qty-input" type="number" min="0" value="${i.stock_quantity}" data-field="stock" title="Stock quantity">
        <input class="inv-row__qty-input" type="number" min="0" step="0.01" value="${i.unit_price}" data-field="price" title="Unit price (₹)">
        <button type="button" class="btn btn--sage btn--sm" data-save="${i.id}">Save</button>
        <button type="button" class="btn btn--ghost btn--sm" data-remove="${i.id}" style="border-color:var(--danger);color:var(--danger);padding:8px;">${icon('trash','style="width:13px;height:13px;"')}</button>
      </div>`).join('');

    listContainer.querySelectorAll('[data-save]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.inv-row');
        const stock = parseInt(row.querySelector('[data-field="stock"]').value, 10);
        const price = parseFloat(row.querySelector('[data-field="price"]').value);
        if (isNaN(stock) || stock < 0 || isNaN(price) || price < 0) {
          showToast('Enter a valid stock quantity and price.', 'error');
          return;
        }
        btn.disabled = true; btn.textContent = '…';
        try {
          await PharmacyAPI.updateInventoryItem(btn.dataset.save, { stock_quantity: stock, unit_price: price });
          showToast('Inventory updated!', 'success');
          loadInventory();
        } catch (err) {
          showToast(err.message || 'Failed to update item.', 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });
    });

    listContainer.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this medicine from your inventory?')) return;
        try {
          await PharmacyAPI.deleteInventoryItem(btn.dataset.remove);
          showToast('Item removed from inventory.', 'default');
          renderModalInventory();
          loadInventory();
        } catch (err) {
          showToast(err.message || 'Failed to remove item.', 'error');
        }
      });
    });

  } catch (err) {
    listContainer.innerHTML = `<div style="font-size:13px; color:var(--danger); text-align:center;">${escapeHtml(err.message)}</div>`;
  }
}

// Auto-refresh orders & inventory periodically so the queue stays live
setInterval(() => { loadOrders(); }, 30000);

/* ── Order Reminders ────────────────────────────────────────
   Nudges the pharmacist with a browser notification when an order has
   sat unconfirmed for too long, so nothing slips through the queue. */
if (window.Notification && Notification.permission === 'default') {
  Notification.requestPermission();
}

const remindedOrders = new Set();
const PENDING_REMINDER_MINUTES = 15;

function checkOrderReminders(orders) {
  if (!orders || !orders.length) return;
  const now = new Date();

  orders.forEach(o => {
    if (o.status !== 'pending') return;
    const ageMins = (now.getTime() - new Date(o.created_at).getTime()) / 60000;
    if (ageMins >= PENDING_REMINDER_MINUTES && !remindedOrders.has(o.id)) {
      remindedOrders.add(o.id);

      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Pending Order Reminder', {
          body: `Order #${o.id} from ${o.patient_name || 'a patient'} has been waiting ${Math.round(ageMins)} min for confirmation.`,
          icon: '/favicon.ico',
        });
      }
      showToast(`Reminder: Order #${o.id} is still pending — confirm or update it.`, 'default');
    }
  });
}
