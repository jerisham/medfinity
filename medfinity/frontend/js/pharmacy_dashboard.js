/* ===================================================================
   Medfinity — Pharmacy dashboard
=================================================================== */

const user = requireAuth(['pharmacist']);

const ICONS = {
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

if (document.getElementById('app')){
  document.getElementById('app').innerHTML = `
    ${renderSidebar('dashboard', 'pharmacist')}
    <main class="main">
      <header class="topbar">
        <div>
          <div class="topbar__title display">${greeting()}, ${escapeHtml((user.name || user.first_name || 'there').split(' ')[0])}</div>
          <div class="topbar__sub">${escapeHtml(user.pharmacy_name || 'Your pharmacy')} — here's today's queue.</div>
        </div>
        <div class="topbar__right">
          <div class="field" style="margin:0;min-width:240px;">
            <input id="medicineSearch" placeholder="Search medicines…">
          </div>
        </div>
      </header>

      <div class="bento">
        <section class="tile tile--peach tile--w2">
          <div class="pulse-wrap"><div class="pulse-blob"></div><div class="avatar">${initials(user.pharmacy_name || user.name)}</div></div>
          <h2 class="display" style="font-size:22px;margin-top:14px;">Every order, looked after.</h2>
          <p style="color:var(--ink-soft);font-size:13.5px;margin:6px 0 0;">${formatDate(new Date())}</p>
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

        <section class="tile tile--w2 tile--h2" id="orderTile">
          <div class="tile__head"><h3>Orders</h3></div>
          <div class="list" id="orderList">${skeletonRows(4)}</div>
        </section>

        <section class="tile tile--w2" id="inventoryTile">
          <div class="tile__head"><h3>Inventory snapshot</h3></div>
          <div class="list" id="inventoryList">${skeletonRows(2)}</div>
        </section>

        <section class="tile" id="searchResultsTile" style="display:none;">
          <div class="tile__head"><h3>Search results</h3></div>
          <div class="list" id="searchResults"></div>
        </section>
      </div>
    </main>
  `;

  loadDashboard();
  setupSearch();
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
        ${next ? `<button class="btn btn--ghost btn--sm" data-order="${o.id}" data-next="${next}">Mark ${next.replace('_',' ')}</button>` : ''}
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
    list.innerHTML = emptyState('Couldn\'t load orders', 'Check that the backend is running.', icon('box'));
  }
}

async function loadInventory(){
  const list = document.getElementById('inventoryList');
  try {
    const data = await PharmacyAPI.inventory();
    const items = data.results || data;
    const low = items.filter(i => i.stock_quantity <= 10);
    document.querySelector('#statLowStock .stat__value').textContent = low.length;

    if (!items.length){ list.innerHTML = emptyState('No inventory listed', '', icon('pill')); return; }
    list.innerHTML = items.slice(0, 6).map(i => `
      <div class="list-row">
        <div class="list-row__icon">${icon('pill')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(i.medicine_name)}</div>
          <div class="list-row__meta">₹${i.unit_price} · ${i.requires_prescription ? 'Rx required' : 'OTC'}</div>
        </div>
        <span class="badge ${i.stock_quantity <= 10 ? 'badge--cancelled' : 'badge--completed'}">${i.stock_quantity} left</span>
      </div>`).join('');
  } catch {
    document.querySelector('#statLowStock .stat__value').textContent = '—';
    list.innerHTML = emptyState('Couldn\'t load inventory', '', icon('pill'));
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