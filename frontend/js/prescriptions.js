/* ===================================================================
   Medfinity — Prescriptions page
   Displays a list of all prescriptions for the patient
=================================================================== */

const user = requireAuth(['patient', 'caregiver']);

const ICONS = {
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  doctor: '<circle cx="11" cy="6" r="3"/><path d="M5 21v-2a6 6 0 0112 0v2"/><path d="M19 8l2 2-4 4"/>',
  file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  truck: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let allPrescriptions = [];
let selectedPrescription = null;
let allPharmacies = [];
let selectedPharmacy = null;
let patientCoords = null;

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('prescriptions', 'patient')}
    <main class="main">
      ${renderTopbar({
        title: 'My Prescriptions',
        sub: 'View active medications, diagnoses and follow up guidance.',
        user
      })}

      <div class="bento" style="grid-template-columns: 1fr 1.5fr; gap: 24px; align-items: start;">
        <!-- Left: Prescriptions List -->
        <section class="tile" style="padding: 20px 24px; min-height: 480px;">
          <div class="tile__head" style="margin-bottom: 18px;">
            <h3 style="display:flex;align-items:center;gap:8px;">
              ${icon('pill', 'style="color:var(--emerald);width:20px;height:20px;"')}
              Prescription History
            </h3>
          </div>
          <div class="list" id="prescriptionList">
            ${skeletonRows(4)}
          </div>
        </section>

        <!-- Right: Prescription Detail View -->
        <section class="tile" id="detailPanel" style="padding: 24px; min-height: 480px;">
          <div id="detailContent">
            <div class="empty">
              ${icon('pill', 'style="width:48px;height:48px;opacity:.25;"')}
              <div class="empty__title">No Prescription Selected</div>
              <div class="empty__sub">Select a prescription from the history to view detailed dosage, medicines and doctor remarks.</div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Order Medicine Modal -->
    <div class="modal-overlay" id="orderModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:20px; overflow-y:auto;">
      <div class="tile" style="background:#fff; width:100%; max-width:640px; padding:28px; border-radius:var(--radius-lg); position:relative; max-height:90vh; overflow-y:auto;">
        <button id="closeOrderModal" style="position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:var(--ink-soft);">${icon('x', 'style="width:20px;height:20px;"')}</button>
        <h3 style="margin-bottom:6px; font-size:20px; color:var(--forest-deep);">Order Medicine</h3>
        <p style="font-size:13px; color:var(--ink-soft); margin:0 0 20px;">Send this prescription's medicines to a pharmacy for delivery or pickup.</p>
        <div id="orderModalContent"></div>
      </div>
    </div>
  `;

  initPage();
}

function initPage() {
  loadPrescriptions();
  document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') closeOrderModal();
  });
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
  selectedPharmacy = null;
}

async function loadPrescriptions() {
  const list = document.getElementById('prescriptionList');
  try {
    const data = await PrescriptionsAPI.list();
    allPrescriptions = data.results || data;
    
    if (!allPrescriptions.length) {
      list.innerHTML = emptyState('No prescriptions found', 'You have no prescriptions recorded.', icon('pill'));
      document.getElementById('detailContent').innerHTML = `
        <div class="empty">
          ${icon('pill', 'style="width:48px;height:48px;opacity:.25;"')}
          <div class="empty__title">No Prescriptions Available</div>
        </div>`;
      return;
    }

    list.innerHTML = allPrescriptions.map(p => `
      <div class="list-row prescription-item" data-id="${p.id}" id="rx-item-${p.id}" style="cursor:pointer; padding: 14px 10px; border-radius: var(--radius-sm); transition: all 0.15s ease;">
        <div class="list-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('pill')}</div>
        <div class="list-row__body">
          <div class="list-row__title" style="font-weight:700;">${escapeHtml(p.diagnosis || 'Prescription')}</div>
          <div class="list-row__meta">Dr. ${escapeHtml(p.doctor_name || 'Specialist')} · ${formatDate(p.created_at)}</div>
        </div>
        ${icon('arrow', 'style="width:16px;height:16px;opacity:.5;"')}
      </div>`).join('');

    // Add click listeners to items
    allPrescriptions.forEach(p => {
      document.getElementById(`rx-item-${p.id}`).addEventListener('click', () => selectPrescription(p));
    });

    // Auto-select first prescription
    selectPrescription(allPrescriptions[0]);

  } catch (err) {
    list.innerHTML = emptyState("Couldn't load prescriptions", err.message, icon('pill'));
  }
}

function selectPrescription(p) {
  selectedPrescription = p;
  
  // Highlight active item
  document.querySelectorAll('.prescription-item').forEach(el => el.classList.remove('is-active', 'tile--peach'));
  const activeEl = document.getElementById(`rx-item-${p.id}`);
  if (activeEl) {
    activeEl.classList.add('is-active', 'tile--peach');
  }

  const detail = document.getElementById('detailContent');
  
  const medicines = p.medicines || [];
  const medsTable = medicines.length ? `
    <div style="margin-top:20px; overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13.5px;">
        <thead>
          <tr style="border-bottom:2px solid var(--glass-border);color:var(--ink-soft);font-weight:700;">
            <th style="padding:10px 8px;">Medicine Name</th>
            <th style="padding:10px 8px;">Dosage</th>
            <th style="padding:10px 8px;">Frequency</th>
            <th style="padding:10px 8px;">Duration</th>
            <th style="padding:10px 8px;">Timing</th>
          </tr>
        </thead>
        <tbody>
          ${medicines.map(m => `
            <tr style="border-bottom:1px solid var(--glass-border);">
              <td style="padding:12px 8px; font-weight:700; color:var(--forest-deep);">${escapeHtml(m.name)}</td>
              <td style="padding:12px 8px; color:var(--ink);">${escapeHtml(m.dosage)}</td>
              <td style="padding:12px 8px; color:var(--ink);">${escapeHtml(m.frequency)}</td>
              <td style="padding:12px 8px; color:var(--ink);">${escapeHtml(m.duration)}</td>
              <td style="padding:12px 8px; color:var(--emerald-hover); font-weight:600;">${escapeHtml(m.timing || 'As directed')}</td>
            </tr>
            ${m.instructions ? `
              <tr style="border-bottom:1px solid var(--glass-border);background:var(--bg-canvas);">
                <td colspan="5" style="padding:8px 12px; font-size:12px; color:var(--ink-soft);">
                  <strong>Instructions:</strong> ${escapeHtml(m.instructions)}
                </td>
              </tr>` : ''}
          `).join('')}
        </tbody>
      </table>
    </div>` : `<div style="padding:16px 0;color:var(--ink-soft);font-size:13.5px;">No medications specified in this prescription.</div>`;

  detail.innerHTML = `
    <div style="display:flex;justify-content:between;align-items:start;flex-wrap:wrap;gap:14px;border-bottom:1px solid var(--glass-border);padding-bottom:16px;">
      <div>
        <h2 class="display" style="font-size:22px;color:var(--forest-deep);">${escapeHtml(p.diagnosis || 'Prescription Details')}</h2>
        <div style="display:flex;align-items:center;gap:16px;margin-top:6px;font-size:13px;color:var(--ink-soft);">
          <span style="display:flex;align-items:center;gap:4px;">${icon('doctor','style="width:14px;height:14px;"')} Dr. ${escapeHtml(p.doctor_name || 'Specialist')}</span>
          <span style="display:flex;align-items:center;gap:4px;">${icon('calendar','style="width:14px;height:14px;"')} ${formatDate(p.created_at)}</span>
        </div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px;">
        <span class="badge badge--completed">${p.is_active ? 'Active' : 'Inactive'}</span>
        ${p.is_active && medicines.length ? `<button class="btn btn--primary btn--sm" id="orderMedicineBtn">${icon('cart','style="width:14px;height:14px;"')} Order Medicine</button>` : ''}
      </div>
    </div>

    <div style="margin-top:20px;">
      <h4 style="font-size:14px;margin-bottom:6px;color:var(--forest-deep);font-weight:700;">Prescribed Medications</h4>
      ${medsTable}
    </div>

    ${p.notes ? `
      <div style="margin-top:24px;background:var(--green-tint);border-radius:var(--radius-sm);padding:16px;border-left:4px solid var(--emerald);">
        <h4 style="font-size:13.5px;margin:0 0 6px;color:var(--forest-deep);font-weight:700;">Doctor Notes / Remarks</h4>
        <p style="margin:0;font-size:13px;color:var(--forest-soft);line-height:1.5;">${escapeHtml(p.notes)}</p>
      </div>` : ''}

    ${p.follow_up_date ? `
      <div style="margin-top:20px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-soft);font-weight:600;">
        <div style="width:24px;height:24px;border-radius:50%;background:var(--blue-tint);color:#3b6fd1;display:flex;align-items:center;justify-content:center;">
          ${icon('calendar','style="width:12px;height:12px;"')}
        </div>
        <span>Recommended follow-up visit: <strong>${formatDate(p.follow_up_date)}</strong></span>
      </div>` : ''}

    <div style="margin-top:20px;" id="orderHistoryWrap"></div>
  `;

  if (p.is_active && medicines.length) {
    document.getElementById('orderMedicineBtn').addEventListener('click', () => openOrderModal(p));
  }
  loadOrderHistory(p.id);
}

/* ── Order Medicine ─────────────────────────────────────── */
async function openOrderModal(prescription) {
  const modal = document.getElementById('orderModal');
  const content = document.getElementById('orderModalContent');
  modal.style.display = 'flex';
  selectedPharmacy = null;
  content.innerHTML = skeletonRows(3);

  // Try to get the patient's live location so we can rank pharmacies by
  // Haversine distance. Falls back to the unsorted pharmacy list if the
  // browser denies/lacks geolocation — ordering still works either way.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          allPharmacies = await UsersAPI.nearbyPharmacists(pos.coords.latitude, pos.coords.longitude);
          patientCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          await loadPharmaciesUnsorted();
        }
        renderPharmacyPicker(prescription);
      },
      async () => {
        await loadPharmaciesUnsorted();
        renderPharmacyPicker(prescription);
      },
      { timeout: 6000 }
    );
  } else {
    await loadPharmaciesUnsorted();
    renderPharmacyPicker(prescription);
  }
}

async function loadPharmaciesUnsorted() {
  try {
    const data = await UsersAPI.pharmacists();
    allPharmacies = data.results || data;
  } catch (err) {
    document.getElementById('orderModalContent').innerHTML = emptyState("Couldn't load pharmacies", err.message, icon('truck'));
  }
}

function renderPharmacyPicker(prescription) {
  const content = document.getElementById('orderModalContent');

  if (!allPharmacies.length) {
    content.innerHTML = emptyState('No pharmacies available', 'There are no registered pharmacies to send this order to yet.', icon('truck'));
    return;
  }

  const hasMapPoints = patientCoords || allPharmacies.some(p => p.latitude != null && p.longitude != null);

  content.innerHTML = `
    <h4 style="font-size:13.5px;margin:0 0 8px;color:var(--forest-deep);font-weight:700;">Choose a Pharmacy</h4>
    <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">
      ${patientCoords ? 'Sorted by distance from your current location.' : "Couldn't detect your location — showing all pharmacies. Enable location access for nearest-first sorting."}
    </div>
    ${hasMapPoints ? '<div id="pharmacyPickerMap" style="height:160px;border-radius:var(--radius-sm);overflow:hidden;margin-bottom:12px;border:1px solid var(--glass-border);"></div>' : ''}
    <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;">
      ${allPharmacies.map(ph => `
        <div class="list-row" style="cursor:pointer;padding:12px 10px;" data-pharmacy="${ph.id}">
          <div class="list-row__icon" style="background:var(--blue-tint);color:#3b6fd1;">${icon('truck')}</div>
          <div class="list-row__body">
            <div class="list-row__title">${escapeHtml(ph.pharmacy_name || `${ph.first_name} ${ph.last_name}`)}</div>
            <div class="list-row__meta">${escapeHtml(ph.address || 'Address not listed')}</div>
          </div>
          ${ph.distance_km != null ? `<span class="badge badge--scheduled" style="flex-shrink:0;">${ph.distance_km} km</span>` : ''}
          ${icon('arrow', 'style="width:16px;height:16px;opacity:.5;"')}
        </div>`).join('')}
    </div>
  `;

  content.querySelectorAll('[data-pharmacy]').forEach(row => {
    row.addEventListener('click', () => {
      selectedPharmacy = allPharmacies.find(ph => ph.id == row.dataset.pharmacy);
      renderOrderForm(prescription);
    });
  });

  if (hasMapPoints) initPharmacyPickerMap();
}

function initPharmacyPickerMap() {
  if (typeof L === 'undefined') return; // Leaflet not loaded on this page
  const mapEl = document.getElementById('pharmacyPickerMap');
  if (!mapEl) return;
  const center = patientCoords ? [patientCoords.lat, patientCoords.lng] : [20.5937, 78.9629];
  const map = L.map(mapEl, { zoomControl: false }).setView(center, patientCoords ? 12 : 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const bounds = [];
  if (patientCoords) {
    L.circleMarker([patientCoords.lat, patientCoords.lng], { radius: 7, color: '#3b6fd1', fillColor: '#3b6fd1', fillOpacity: 1 })
      .addTo(map).bindPopup('You are here');
    bounds.push([patientCoords.lat, patientCoords.lng]);
  }
  allPharmacies.forEach(ph => {
    if (ph.latitude != null && ph.longitude != null) {
      L.marker([ph.latitude, ph.longitude]).addTo(map)
        .bindPopup(`${ph.pharmacy_name || 'Pharmacy'}${ph.distance_km != null ? ` · ${ph.distance_km} km` : ''}`);
      bounds.push([ph.latitude, ph.longitude]);
    }
  });
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [20, 20] });
}

function renderOrderForm(prescription) {
  const content = document.getElementById('orderModalContent');
  const medicines = prescription.medicines || [];
  const pharmacyName = selectedPharmacy.pharmacy_name || `${selectedPharmacy.first_name} ${selectedPharmacy.last_name}`;

  content.innerHTML = `
    <button id="backToPharmacy" style="background:none;border:none;color:var(--emerald-hover);font-size:12.5px;font-weight:700;cursor:pointer;padding:0;margin-bottom:14px;display:flex;align-items:center;gap:4px;">
      ← Change pharmacy
    </button>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding:10px 12px;background:var(--blue-tint);border-radius:var(--radius-sm);">
      ${icon('truck', 'style="width:16px;height:16px;color:#3b6fd1;flex-shrink:0;"')}
      <span style="font-size:13px;font-weight:700;color:var(--forest-deep);">Ordering from ${escapeHtml(pharmacyName)}</span>
    </div>

    <h4 style="font-size:13.5px;margin:0 0 10px;color:var(--forest-deep);font-weight:700;">Select Medicines</h4>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
      ${medicines.map(m => `
        <label style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--glass-border);border-radius:var(--radius-sm);cursor:pointer;">
          <input type="checkbox" class="order-med-check" data-id="${m.id}" data-name="${escapeHtml(m.name)}" checked style="width:auto;cursor:pointer;">
          <div style="flex:1;">
            <div style="font-size:13.5px;font-weight:700;color:var(--forest-deep);">${escapeHtml(m.name)}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);">${escapeHtml(m.dosage)} · ${escapeHtml(m.duration)}</div>
          </div>
          <input type="number" class="order-med-qty" data-id="${m.id}" min="1" value="1" style="width:60px;padding:6px 8px;border:1px solid var(--glass-border);border-radius:6px;font-size:13px;">
        </label>`).join('')}
    </div>

    <div class="field">
      <label for="deliveryType">Delivery Type</label>
      <select id="deliveryType">
        <option value="delivery">Home Delivery</option>
        <option value="pickup">Pickup at Pharmacy</option>
      </select>
    </div>
    <div class="field" id="addressField">
      <label for="deliveryAddress">Delivery Address</label>
      <textarea id="deliveryAddress" rows="2" placeholder="Enter your full delivery address…">${escapeHtml(user.address || '')}</textarea>
    </div>

    <div id="orderFormError" class="form-error"></div>
    <button class="btn btn--primary btn--sm btn--block" id="confirmOrderBtn" style="margin-top:8px;">${icon('cart','style="width:14px;height:14px;"')} Place Order</button>
  `;

  document.getElementById('backToPharmacy').addEventListener('click', () => renderPharmacyPicker(prescription));

  const deliveryType = document.getElementById('deliveryType');
  const addressField = document.getElementById('addressField');
  deliveryType.addEventListener('change', () => {
    addressField.style.display = deliveryType.value === 'pickup' ? 'none' : 'flex';
  });

  document.getElementById('confirmOrderBtn').addEventListener('click', () => confirmOrder(prescription));
}

async function confirmOrder(prescription) {
  const btn = document.getElementById('confirmOrderBtn');
  const errBox = document.getElementById('orderFormError');
  errBox.classList.remove('is-visible');

  const checks = Array.from(document.querySelectorAll('.order-med-check'));
  const selected = checks.filter(c => c.checked);

  if (!selected.length) {
    errBox.textContent = 'Select at least one medicine to order.';
    errBox.classList.add('is-visible');
    return;
  }

  const deliveryType = document.getElementById('deliveryType').value;
  const deliveryAddress = document.getElementById('deliveryAddress')?.value.trim();

  if (deliveryType === 'delivery' && !deliveryAddress) {
    errBox.textContent = 'Enter a delivery address, or switch to pharmacy pickup.';
    errBox.classList.add('is-visible');
    return;
  }

  const items = selected.map(c => {
    const qtyInput = document.querySelector(`.order-med-qty[data-id="${c.dataset.id}"]`);
    return { medicine_id: parseInt(c.dataset.id, 10), quantity: parseInt(qtyInput.value, 10) || 1 };
  });

  const payload = {
    prescription: prescription.id,
    pharmacy: selectedPharmacy.id,
    items,
    delivery_type: deliveryType,
    delivery_address: deliveryType === 'pickup' ? (selectedPharmacy.address || 'Pharmacy pickup') : deliveryAddress,
  };

  btn.disabled = true;
  btn.textContent = 'Placing order…';

  try {
    await PharmacyAPI.createOrder(payload);
    showToast('Order placed! The pharmacy has been notified. 🎉', 'success');
    closeOrderModal();
    loadOrderHistory(prescription.id);
  } catch (err) {
    errBox.textContent = err.message || 'Could not place order. Try again.';
    errBox.classList.add('is-visible');
    btn.disabled = false;
    btn.innerHTML = `${icon('cart','style="width:14px;height:14px;"')} Place Order`;
  }
}

async function loadOrderHistory(prescriptionId) {
  const wrap = document.getElementById('orderHistoryWrap');
  if (!wrap) return;
  try {
    const data = await PharmacyAPI.orders();
    const items = (data.results || data).filter(o => o.prescription === prescriptionId);
    if (!items.length) { wrap.innerHTML = ''; return; }

    wrap.innerHTML = `
      <h4 style="font-size:13.5px;margin:0 0 10px;color:var(--forest-deep);font-weight:700;">Pharmacy Orders</h4>
      <div class="list">
        ${items.map(o => `
          <div class="list-row">
            <div class="list-row__icon" style="background:var(--blue-tint);color:#3b6fd1;">${icon('truck')}</div>
            <div class="list-row__body">
              <div class="list-row__title">${escapeHtml(o.pharmacy_name || 'Pharmacy')} · Order #${o.id}</div>
              <div class="list-row__meta">₹${o.total_amount} · ${o.delivery_type === 'pickup' ? 'Pickup' : 'Delivery'} · ${formatDate(o.created_at)}</div>
            </div>
            <span class="badge badge--${o.status === 'delivered' ? 'completed' : o.status === 'cancelled' ? 'cancelled' : 'scheduled'}">${o.status.replace(/_/g,' ')}</span>
          </div>`).join('')}
      </div>
    `;
  } catch {
    wrap.innerHTML = '';
  }
}