/* ===================================================================
   Medfinity — Pharmacy Dashboard & Inventory Management
   Enables pharmacists to track orders and manage medicine inventory.
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
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let allInventory = [];

if (document.getElementById('app')){
  const firstName = escapeHtml((user.name || user.first_name || 'there').split(' ')[0]);
  const params = new URLSearchParams(window.location.search);
  const activeTab = params.get('tab') || 'dashboard';

  document.getElementById('app').innerHTML = `
    ${renderSidebar(activeTab, 'pharmacist')}
    <main class="main">
      ${renderTopbar({
        title: `${greeting()}, ${firstName} 👋`,
        sub: `${escapeHtml(user.pharmacy_name || 'Your pharmacy')} — here's today's queue.`,
        user,
        hideSearch: true
      })}

      <div class="bento" id="bento" style="grid-template-columns: 2fr 1.3fr 1.3fr;">
        <section class="tile tile--peach hero-card">
          <h2 class="display">Every order, looked after</h2>
          <p>Track incoming prescriptions, manage stock and keep deliveries moving — all in one place.</p>
          <button class="btn btn--primary" id="openInvBtn" style="align-self:flex-start;">Manage Inventory</button>
        </section>

        <section class="tile" id="statPending">
          <div class="eyebrow">Pending</div>
          <div class="stat__value">–</div>
          <div class="stat__label">orders</div>
        </section>

        <section class="tile tile--ink" id="statLowStock">
          <div class="eyebrow">Low stock</div>
          <div class="stat__value">–</div>
          <div class="stat__label">items to restock</div>
        </section>

        <section class="tile order-card tile--w2">
          <div class="tile__head"><h3>Search Inventory</h3></div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0;">Find a medicine by name and check stock on the spot.</p>
          <div class="order-card__search">
            <input id="medicineSearch" placeholder="Search medicines…">
            <button>${icon('search')}</button>
          </div>
        </section>

        <section class="tile cta-card" style="background:var(--peach-tint);border-color:transparent;">
          <div class="cta-card__icon">${icon('truck')}</div>
          <h3 style="margin-bottom:6px;">Deliveries Ready</h3>
          <p style="font-size:13px;color:var(--ink-soft);flex:1;margin:0 0 14px;">Keep orders moving to your patients' doors.</p>
        </section>

        <section class="tile tile--w2 tile--h2" id="orderTile">
          <div class="tile__head"><h3>Orders Queue</h3></div>
          <div class="list" id="orderList">${skeletonRows(4)}</div>
        </section>

        <section class="tile" id="inventoryTile">
          <div class="tile__head"><h3>Inventory Snapshot</h3></div>
          <div class="list" id="inventoryList">${skeletonRows(2)}</div>
        </section>

        <section class="tile" id="searchResultsTile" style="display:none;">
          <div class="tile__head"><h3>Search Results</h3></div>
          <div class="list" id="searchResults"></div>
        </section>

        <section class="tile tile--ink connect-card">
          <h3 style="font-size:18px;">Care that arrives on time</h3>
          <div class="connect-card__feature">${icon('check')} Orders you can trust</div>
          <div class="connect-card__feature">${icon('check')} Stock kept up to date</div>
          <div class="connect-card__feature">${icon('check')} Deliveries, just a click away</div>
        </section>
      </div>
    </main>

    <!-- Manage Inventory Modal -->
    <div class="modal-overlay" id="inventoryModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:20px; overflow-y:auto;">
      <div class="tile" style="background:#fff; width:100%; max-width:720px; padding:28px; border-radius:var(--radius-lg); position:relative;">
        <button id="closeInvModal" style="position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:var(--ink-soft);">${icon('x', 'style="width:20px;height:20px;"')}</button>
        <h3 style="margin-bottom:6px; font-size:20px; color:var(--forest-deep);">Manage Inventory</h3>
        <p style="font-size:13px; color:var(--ink-soft); margin:0 0 20px;">Add new medicines or restock existing inventory.</p>
        
        <div style="display:grid; grid-template-columns: 1.2fr 1.8fr; gap:24px;">
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
            <div style="max-height:380px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;" id="modalInventoryList">
              <!-- Render list of inventory -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadDashboard();
  setupSearch();
  setupInventoryModal();

  if (activeTab === 'inventory') {
    setTimeout(() => {
      document.getElementById('openInvBtn')?.click();
    }, 300);
  } else if (activeTab === 'orders') {
    setTimeout(() => {
      document.getElementById('orderTile')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
}

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

async function loadDashboard(){
  loadOrders();
  loadInventory();
}

async function loadOrders(){
  const list = document.getElementById('orderList');
  try {
    const data = await PharmacyAPI.orders();
    const items = data.results || data;
    document.querySelector('#statPending .stat__value').textContent =
      items.filter(o => o.status === 'pending').length;

    if (!items.length){
      list.innerHTML = emptyState('No orders yet', 'New prescriptions will land here.', icon('box'));
      return;
    }
    list.innerHTML = items.map(o => {
      const nextIdx = STATUS_FLOW.indexOf(o.status) + 1;
      const next = STATUS_FLOW[nextIdx];
      return `
      <div class="list-row">
        <div class="list-row__icon">${icon('box')}</div>
        <div class="list-row__body">
          <div class="list-row__title">Order #${o.id} · ₹${o.total_amount}</div>
          <div class="list-row__meta">${o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} · ${formatDate(o.created_at)}</div>
        </div>
        <span class="badge badge--${o.status}">${o.status.replace(/_/g,' ')}</span>
        ${next ? `<button class="btn btn--ghost btn--sm" data-order="${o.id}" data-next="${next}" style="font-size:11px; padding:4px 8px;">Mark ${next.replace(/_/g,' ')}</button>` : ''}
      </div>`;
    }).join('');

    list.querySelectorAll('button[data-order]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await PharmacyAPI.updateStatus(btn.dataset.order, btn.dataset.next);
          showToast('Order updated', 'success');
          loadOrders();
        } catch (err){ showToast(err.message, 'error'); btn.disabled = false; }
      });
    });
  } catch {
    document.querySelector('#statPending .stat__value').textContent = '—';
    list.innerHTML = emptyState("Couldn't load orders", 'Check that the backend is running.', icon('box'));
  }
}

async function loadInventory(){
  const list = document.getElementById('inventoryList');
  try {
    const data = await PharmacyAPI.inventory();
    allInventory = data.results || data;
    const low = allInventory.filter(i => i.stock_quantity <= 10);
    document.querySelector('#statLowStock .stat__value').textContent = low.length;

    if (!allInventory.length){ list.innerHTML = emptyState('No inventory listed', '', icon('pill')); return; }
    list.innerHTML = allInventory.slice(0, 5).map(i => `
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
  const tile = document.getElementById('searchResultsTile');
  const results = document.getElementById('searchResults');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q){ tile.style.display = 'none'; return; }
    timer = setTimeout(async () => {
      tile.style.display = 'flex';
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
  const openBtn = document.getElementById('openInvBtn');
  const modal = document.getElementById('inventoryModal');
  const closeBtn = document.getElementById('closeInvModal');
  const addForm = document.getElementById('addMedForm');

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    renderModalInventory();
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    loadInventory(); // reload dashboard stats
  });

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
      <div class="list-row" style="padding:10px 4px;">
        <div style="flex:1;">
          <div style="font-size:13.5px; font-weight:700; color:var(--forest-deep);">${escapeHtml(i.medicine_name)}</div>
          <div style="font-size:11.5px; color:var(--ink-soft);">${escapeHtml(i.generic_name || 'No generic name')} · ₹${i.unit_price} · ${i.requires_prescription ? 'Rx' : 'OTC'}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:13px; font-weight:700; color:var(--forest-deep);">${i.stock_quantity} left</span>
          <button class="btn btn--ghost btn--sm" style="font-size:11px; padding:3px 6px;" onclick="restockItem(${i.id}, '${escapeHtml(i.medicine_name)}', ${i.stock_quantity}, ${i.unit_price})">Update</button>
        </div>
      </div>`).join('');

  } catch (err) {
    listContainer.innerHTML = `<div style="font-size:13px; color:var(--danger); text-align:center;">${escapeHtml(err.message)}</div>`;
  }
}

window.restockItem = async function(id, name, currentStock, currentPrice) {
  const newStock = prompt(`Update stock quantity for ${name}:`, currentStock);
  if (newStock === null) return;
  const parsedStock = parseInt(newStock, 10);
  if (isNaN(parsedStock) || parsedStock < 0) {
    alert('Please enter a valid stock quantity.');
    return;
  }

  const newPrice = prompt(`Update unit price (₹) for ${name}:`, currentPrice);
  if (newPrice === null) return;
  const parsedPrice = parseFloat(newPrice);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    alert('Please enter a valid unit price.');
    return;
  }

  try {
    await PharmacyAPI.updateInventoryItem(id, {
      stock_quantity: parsedStock,
      unit_price: parsedPrice
    });
    showToast('Inventory item updated!', 'success');
    renderModalInventory();
  } catch (err) {
    alert(err.message || 'Failed to update item.');
  }
};
