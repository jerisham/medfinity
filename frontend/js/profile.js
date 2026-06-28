/* ===================================================================
   Medfinity — Profile & Account Settings
   Enables viewing and editing user specific account details.
=================================================================== */

const user = requireAuth(['patient', 'doctor', 'pharmacist', 'caregiver']);

const ICONS = {
  user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 110-8 4 4 0 010 8z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let profileData = null;

if (document.getElementById('app')) {
  const roleName = user.user_type === 'pharmacist' ? 'pharmacy' : user.user_type;
  // 'profile' is not a sidebar nav key — use 'dashboard' so no link gets wrongly highlighted
  document.getElementById('app').innerHTML = `
    ${renderSidebar('dashboard', roleName)}
    <main class="main">
      ${renderTopbar({
        title: 'Account Settings',
        sub: 'View and update your personal info, credentials and practice details.',
        user,
        hideSearch: user.user_type === 'doctor' || user.user_type === 'pharmacist'
      })}

      <div class="bento bento--profile" style="gap: 24px; align-items: start;">
        <!-- Edit Profile Form -->
        <section class="tile" style="padding: 24px;">
          <h3 style="margin-bottom: 20px; color:var(--forest-deep); display:flex; align-items:center; gap:8px;">
            Personal Details
          </h3>
          
          <div id="profileFormError" class="form-error"></div>
          
          <form id="profileForm">
            <!-- Common Fields -->
            <div class="field-row">
              <div class="field">
                <label for="first_name">First Name</label>
                <input id="first_name" required>
              </div>
              <div class="field">
                <label for="last_name">Last Name</label>
                <input id="last_name" required>
              </div>
            </div>
            
            <div class="field-row">
              <div class="field">
                <label for="email">Email Address</label>
                <input id="email" type="email" required>
              </div>
              <div class="field">
                <label for="phone">Phone Number</label>
                <input id="phone">
              </div>
            </div>

            <div class="field" id="dobFieldContainer">
              <label for="date_of_birth">Date of Birth</label>
              <input id="date_of_birth" type="date">
            </div>

            <div class="field">
              <label for="address">Address / Location</label>
              <textarea id="address" rows="2" style="font-family:var(--font-body); font-size:14px; padding:12px 14px; border:1px solid var(--glass-border); border-radius:var(--radius-sm); resize:vertical;"></textarea>
            </div>

            <!-- Doctor Specific Fields -->
            <div id="doctorFields" style="display:none;">
              <div class="field">
                <label for="specialization">Specialization</label>
                <select id="specialization">
                  <option value="General">General Physician</option>
                  <option value="Cardiology">Cardiologist</option>
                  <option value="Dermatology">Dermatologist</option>
                  <option value="Neurology">Neurologist</option>
                  <option value="Orthopedics">Orthopedic Surgeon</option>
                  <option value="Pediatrics">Pediatrician</option>
                  <option value="Gynecology">Gynecologist</option>
                  <option value="Psychiatry">Psychiatrist</option>
                  <option value="ENT">ENT Specialist</option>
                  <option value="Ophthalmology">Ophthalmologist</option>
                  <option value="Urology">Urologist</option>
                  <option value="Oncology">Oncologist</option>
                  <option value="Endocrinology">Endocrinologist</option>
                  <option value="Pulmonology">Pulmonologist</option>
                  <option value="Gastroenterology">Gastroenterologist</option>
                </select>
              </div>
              <div class="field">
                <label for="license_number">Medical License Number</label>
                <input id="license_number">
              </div>
              <div class="field-row">
                <div class="field">
                  <label for="experience_years">Years of Experience</label>
                  <input id="experience_years" type="number" min="0">
                </div>
                <div class="field">
                  <label for="consultation_fee">Consultation Fee (₹)</label>
                  <input id="consultation_fee" type="number" min="0">
                </div>
              </div>
              <div class="field" style="flex-direction:row; align-items:center; gap:8px; margin-top:8px;">
                <input type="checkbox" id="is_available" style="width:auto; cursor:pointer;">
                <label for="is_available" style="cursor:pointer; margin-bottom:0;">Available for appointments</label>
              </div>
            </div>

            <!-- Patient Specific Fields -->
            <div id="patientFields" style="display:none;">
              <div class="field">
                <label for="blood_group">Blood Group</label>
                <select id="blood_group">
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div class="field">
                <label for="allergies">Known Allergies (comma separated)</label>
                <textarea id="allergies" placeholder="e.g. Penicillin, Pollen, Peanuts..." rows="2" style="font-family:var(--font-body); font-size:14px; padding:12px 14px; border:1px solid var(--glass-border); border-radius:var(--radius-sm); resize:vertical;"></textarea>
              </div>
              <div class="field">
                <label for="chronic_conditions">Chronic Conditions (comma separated)</label>
                <textarea id="chronic_conditions" placeholder="e.g. Hypertension, Diabetes, Asthma..." rows="2" style="font-family:var(--font-body); font-size:14px; padding:12px 14px; border:1px solid var(--glass-border); border-radius:var(--radius-sm); resize:vertical;"></textarea>
              </div>
              <div class="field">
                <label for="emergency_contact">Emergency Contact Phone</label>
                <input id="emergency_contact">
              </div>
            </div>

            <!-- Pharmacy Specific Fields -->
            <div id="pharmacyFields" style="display:none;">
              <div class="field">
                <label for="pharmacy_name">Pharmacy Store Name</label>
                <input id="pharmacy_name">
              </div>
              <div class="field">
                <label for="pharmacy_license">Pharmacy License Number</label>
                <input id="pharmacy_license">
              </div>
            </div>

            <button type="submit" class="btn btn--primary btn--sm" id="saveProfileBtn" style="margin-top:12px;">
              ${icon('save')} Save Changes
            </button>
          </form>
        </section>

        <!-- Right Side: Mini Profile Overview -->
        <section class="tile tile--peach" style="padding: 24px;">
          <div style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:10px 0;">
            <div class="avatar" style="width:72px; height:72px; font-size:24px; margin-bottom:14px; box-shadow:var(--shadow-lift);">
              ${initials(user.name || `${user.first_name || ''} ${user.last_name || ''}`)}
            </div>
            <h3 style="font-size:18px; color:var(--forest-deep);" id="overviewName">Loading...</h3>
            <span class="badge badge--completed" style="margin-top:6px; font-size:11px;" id="overviewRole">Loading...</span>
            
            <div style="width:100%; border-top:1px solid var(--glass-border); margin-top:20px; padding-top:16px; text-align:left; font-size:13px; color:var(--ink-soft); display:flex; flex-direction:column; gap:8px;" id="overviewDetails">
              <!-- Dynamic Details -->
            </div>
          </div>
        </section>
      </div>
    </main>
  `;

  initPage();
}

function initPage() {
  loadProfile();
  document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
}

async function loadProfile() {
  const form = document.getElementById('profileForm');
  const errBox = document.getElementById('profileFormError');
  errBox.classList.remove('is-visible');

  try {
    profileData = await UsersAPI.profile();
    
    // Fill common fields
    form.first_name.value    = profileData.first_name || '';
    form.last_name.value     = profileData.last_name || '';
    form.email.value         = profileData.email || '';
    form.phone.value         = profileData.phone || '';
    if (form.date_of_birth) form.date_of_birth.value = profileData.date_of_birth || '';
    form.address.value       = profileData.address || '';

    // Populate role specific fields and show them
    const userType = profileData.user_type;
    const dobContainer = document.getElementById('dobFieldContainer');
    if (userType === 'doctor') {
      if (dobContainer) dobContainer.style.display = 'none';
      document.getElementById('doctorFields').style.display = 'block';
      form.specialization.value   = profileData.specialization || 'General';
      form.license_number.value   = profileData.license_number || '';
      form.experience_years.value = profileData.experience_years || 0;
      form.consultation_fee.value = parseInt(profileData.consultation_fee, 10) || 0;
      form.is_available.checked   = profileData.is_available;
    } else if (userType === 'patient' || userType === 'caregiver') {
      if (dobContainer) dobContainer.style.display = 'flex';
      document.getElementById('patientFields').style.display = 'block';
      form.blood_group.value        = profileData.blood_group || '';
      form.allergies.value          = profileData.allergies || '';
      form.chronic_conditions.value = profileData.chronic_conditions || '';
      form.emergency_contact.value  = profileData.emergency_contact || '';
    } else if (userType === 'pharmacist') {
      if (dobContainer) dobContainer.style.display = 'none';
      document.getElementById('pharmacyFields').style.display = 'block';
      form.pharmacy_name.value    = profileData.pharmacy_name || '';
      form.pharmacy_license.value = profileData.pharmacy_license || '';
    }

    renderOverview();

  } catch (err) {
    errBox.textContent = err.message || 'Failed to load profile details.';
    errBox.classList.add('is-visible');
  }
}

function renderOverview() {
  const name = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'User Profile';
  const roleLabel = { patient: 'Patient', caregiver: 'Patient', doctor: 'Doctor', pharmacist: 'Pharmacist' }[profileData.user_type] || 'User';
  
  document.getElementById('overviewName').textContent = name;
  document.getElementById('overviewRole').textContent = roleLabel;

  const detailsContainer = document.getElementById('overviewDetails');
  let detailsHtml = `
    <div><strong>Username:</strong> ${escapeHtml(profileData.username)}</div>
    <div><strong>Joined:</strong> ${formatDate(profileData.created_at)}</div>
  `;

  if (profileData.user_type === 'doctor') {
    detailsHtml += `
      <div><strong>Specialty:</strong> ${escapeHtml(profileData.specialization || 'General Practitioner')}</div>
      <div><strong>License:</strong> ${escapeHtml(profileData.license_number || 'None')}</div>
      <div><strong>Experience:</strong> ${profileData.experience_years || 0} years</div>
      <div><strong>Fee:</strong> ₹${profileData.consultation_fee || 0} per visit</div>
    `;
  } else if (profileData.user_type === 'patient' || profileData.user_type === 'caregiver') {
    detailsHtml += `
      <div><strong>Blood Group:</strong> ${escapeHtml(profileData.blood_group || 'O+')}</div>
      <div><strong>Chronic Conditions:</strong> ${escapeHtml(profileData.chronic_conditions || 'None')}</div>
    `;
  } else if (profileData.user_type === 'pharmacist') {
    detailsHtml += `
      <div><strong>Pharmacy Name:</strong> ${escapeHtml(profileData.pharmacy_name || 'N/A')}</div>
      <div><strong>License:</strong> ${escapeHtml(profileData.pharmacy_license || 'N/A')}</div>
    `;
  }

  detailsContainer.innerHTML = detailsHtml;
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('saveProfileBtn');
  const errBox = document.getElementById('profileFormError');
  errBox.classList.remove('is-visible');
  
  btn.disabled = true;
  btn.innerHTML = 'Saving Changes…';

  const form = document.getElementById('profileForm');
  const payload = {
    first_name:    form.first_name.value.trim(),
    last_name:     form.last_name.value.trim(),
    email:         form.email.value.trim(),
    phone:         form.phone.value.trim(),
    address:       form.address.value.trim(),
  };

  const userType = profileData.user_type;
  if (userType === 'patient' || userType === 'caregiver') {
    payload.date_of_birth = form.date_of_birth.value || null;
    payload.blood_group        = form.blood_group.value;
    payload.allergies          = form.allergies.value.trim();
    payload.chronic_conditions = form.chronic_conditions.value.trim();
    payload.emergency_contact  = form.emergency_contact.value.trim();
  } else if (userType === 'doctor') {
    payload.specialization   = form.specialization.value;
    payload.license_number   = form.license_number.value.trim();
    payload.experience_years = parseInt(form.experience_years.value, 10) || 0;
    payload.consultation_fee = parseFloat(form.consultation_fee.value) || 0;
    payload.is_available     = form.is_available.checked;
  } else if (userType === 'pharmacist') {
    payload.pharmacy_name    = form.pharmacy_name.value.trim();
    payload.pharmacy_license = form.pharmacy_license.value.trim();
  }

  try {
    const updated = await UsersAPI.updateProfile(payload);
    profileData = updated;
    setCurrentUser(updated); // Update localStorage copy
    showToast('Profile updated successfully! ✨', 'success');
    renderOverview();
  } catch (err) {
    errBox.textContent = err.message || 'Failed to save changes. Try again.';
    errBox.classList.add('is-visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon('save')} Save Changes`;
  }
}
