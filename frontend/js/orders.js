/* ===================================================================
   Medfinity — My Orders (Patient)
   Full tracking view for every pharmacy order the patient has placed:
   live status timeline, items, pharmacy info, and cancel-while-pending.
=================================================================== */

const user = requireAuth(['patient', 'caregiver']);

const ICONS = {
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  truck: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const ORDER_FILTERS = [
  { key: 'active',    label: 'Active',    test: o => !['delivered', 'cancelled'].includes(o.status) },
  { key: 'delivered',  label: 'Delivered', test: o => o.status === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', test: o => o.status === 'cancelled' },
  { key: 'all',       label: 'All orders', test: () => true },
];

let allOrders = [];
let activeFilter = 'active';

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('orders', 'patient')}
    <main class="main">
      ${renderTopbar({
        title: 'My Orders',
        sub: 'Track every medicine order from confirmation through delivery.',
        user
      })}

      <section class="tile" style="padding:20px 24px;">
        <div class="tile__head" style="margin-bottom:6px;">
          <h3 style="display:flex;align-items:center;gap:8px;">
            ${icon('box', 'style="color:var(--emerald);width:20px;height:20px;"')}
            Order Tracking
          </h3>
          <span class="tile-link" id="orderCount"></span>
        </div>
        <div class="filter-tabs" id="orderFilters" style="margin:14px 0 16px;"></div>
        <div id="orderList">${skeletonRows(4)}</div>
      </section>
    </main>
  `;
  loadOrders();
}

async function loadOrders() {
  const list = document.getElementById('orderList');
  try {
    const data = await PharmacyAPI.orders();
    allOrders = data.results || data;
    renderFilters();
    renderOrders();
  } catch (err) {
    list.innerHTML = emptyState("Couldn't load your orders", err.message, icon('box'));
  }
}

function renderFilters() {
  const wrap = document.getElementById('orderFilters');
  wrap.innerHTML = ORDER_FILTERS.map(f => {
    const n = allOrders.filter(f.test).length;
    return `<button type="button" class="filter-tab${f.key === activeFilter ? ' is-active' : ''}" data-filter="${f.key}">${f.label} <span class="count">${n}</span></button>`;
  }).join('');
  wrap.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      renderFilters();
      renderOrders();
    });
  });
}

function renderOrders() {
  const list = document.getElementById('orderList');
  const countEl = document.getElementById('orderCount');
  const filterDef = ORDER_FILTERS.find(f => f.key === activeFilter) || ORDER_FILTERS[0];
  const items = allOrders.filter(filterDef.test);
  countEl.textContent = `${allOrders.length} total order${allOrders.length !== 1 ? 's' : ''}`;

  if (!items.length) {
    list.innerHTML = emptyState('No orders here', 'Orders you place from a prescription will show up here.', icon('box'));
    return;
  }

  list.innerHTML = items.map(o => orderRowHtml(o)).join('');

  list.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this order? This cannot be undone.')) return;
      btn.disabled = true;
      try {
        await PharmacyAPI.cancelOrder(btn.dataset.cancel);
        showToast('Order cancelled', 'default');
        loadOrders();
      } catch (err) {
        showToast(err.message || 'Could not cancel this order.', 'error');
        btn.disabled = false;
      }
    });
  });
}

function orderRowHtml(o) {
  const isCancelled = o.status === 'cancelled';
  const stepIdx = STATUS_FLOW.indexOf(o.status);
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
          <div class="order-card-row__meta">${escapeHtml(o.pharmacy_name || 'Pharmacy')} · ${o.delivery_type === 'delivery' ? icon('truck','style="width:12px;height:12px;display:inline;vertical-align:-2px;"') + ' Delivery' : 'Pickup'} · ${formatDate(o.created_at)}</div>
          ${items ? `<div class="order-card-row__meta" style="margin-top:4px;">${items}</div>` : ''}
        </div>
        <span class="badge badge--${o.status}" style="font-size:13px;">${o.status.replace(/_/g,' ')}</span>
      </div>
      ${stepperHtml}
      ${(!isCancelled && o.status === 'pending') ? `
        <div class="order-card-row__actions">
          <button class="btn btn--ghost btn--sm" data-cancel="${o.id}" style="border-color:var(--danger);color:var(--danger);">Cancel order</button>
        </div>` : ''}
    </div>`;
}
