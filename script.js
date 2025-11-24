document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bookingForm');
  const successMessage = document.getElementById('successMessage');
  const reloadingSelect = document.getElementById('reloading');
  const reloadingFields = document.getElementById('reloadingFields');
  const reloadCity = document.getElementById('reloadCity');
  const newTruckNumber = document.getElementById('newTruckNumber');
  const dateInput = document.getElementById('date');
  const timeslotSelect = document.getElementById('timeslot');
  const submitBtn = document.getElementById('submitBtn');

  const API_BASE = 'http://localhost:3000'; // backend base URL

  // Set min date to today
  const today = new Date();
  dateInput.min = today.toISOString().split('T')[0];

  // Toggle reloading fields
  reloadingSelect.addEventListener('change', () => {
    if (reloadingSelect.value === 'yes') {
      reloadingFields.classList.add('show');
      reloadingFields.setAttribute('aria-hidden', 'false');
      reloadCity.required = true;
      newTruckNumber.required = true;
      setTimeout(() => reloadCity.focus(), 150);
    } else {
      reloadingFields.classList.remove('show');
      reloadingFields.setAttribute('aria-hidden', 'true');
      reloadCity.required = false;
      newTruckNumber.required = false;
      reloadCity.value = '';
      newTruckNumber.value = '';
    }
  });

  // Fetch reserved slots from backend
  async function fetchReservedSlots(date) {
    try {
      const response = await fetch(`${API_BASE}/reserved?date=${date}`);
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      return data.reservedSlots || [];
    } catch (err) {
      console.error('Error fetching reserved slots:', err);
      return [];
    }
  }

  // Update timeslot dropdown based on reserved slots
  async function updateTimeslots(date) {
    const reserved = await fetchReservedSlots(date);
    let availableCount = 0;

    // Reset any "No slots available" message
    [...timeslotSelect.options].forEach(opt => {
      if (opt.textContent === 'No slots available') opt.remove();
    });

    [...timeslotSelect.options].forEach(opt => {
      if (!opt.value) return; // skip placeholder
      if (reserved.includes(opt.value)) {
        opt.hidden = true; // hide reserved slot
      } else {
        opt.hidden = false;
        availableCount++;
      }
    });

    if (availableCount === 0) {
      const msgOption = document.createElement('option');
      msgOption.textContent = 'No slots available';
      msgOption.disabled = true;
      timeslotSelect.appendChild(msgOption);
    }
  }

  // Hook into date change
  dateInput.addEventListener('change', () => {
    if (dateInput.value) updateTimeslots(dateInput.value);
  });

  // Validation helper
  function validateField(el) {
    const errorEl = document.getElementById(el.id + 'Error');
    if (el.required && !el.value.trim()) {
      errorEl.textContent = 'This field is required.';
      el.classList.add('is-invalid');
      return false;
    } else if (el.type === 'email' && el.value) {
      const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailPattern.test(el.value)) {
        errorEl.textContent = 'Please enter a valid email.';
        el.classList.add('is-invalid');
        return false;
      }
    }
    errorEl.textContent = '';
    el.classList.remove('is-invalid');
    if (el.value) el.classList.add('is-valid');
    return true;
  }

  // Form submission
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let valid = true;

    [...form.elements].forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        if (!validateField(el)) valid = false;
      }
    });

    if (!valid) return;

    // Show loading spinner
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Build payload
    const payload = {
      contactName: form.contactName.value,
      contactEmail: form.contactEmail.value,
      company: form.company.value,
      vat: form.vat.value,
      truckPlate: form.truckPlate.value,
      reloadCity: form.reloadCity.value,
      newTruckNumber: form.newTruckNumber.value,
      date: form.date.value,
      timeslot: form.timeslot.value
    };

    try {
      const response = await fetch(`${API_BASE}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        const data = await response.json();
        successMessage.textContent = `❌ ${data.error}`;
        successMessage.style.display = 'block';
        setTimeout(() => successMessage.style.display = 'none', 5000);
      } else if (!response.ok) {
        throw new Error('Submission failed');
      } else {
        const data = await response.json();
        successMessage.textContent = '✅ Booking submitted successfully!';
        successMessage.style.display = 'block';
        form.reset();
        reloadingFields.classList.remove('show');
        reloadingFields.setAttribute('aria-hidden', 'true');
        setTimeout(() => successMessage.style.display = 'none', 5000);
        // Refresh timeslots
        updateTimeslots(payload.date);
      }
    } catch (err) {
      console.error(err);
      successMessage.textContent = '❌ Error submitting booking. Please try again.';
      successMessage.style.display = 'block';
      setTimeout(() => successMessage.style.display = 'none', 5000);
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  // Initialize timeslots for today
  if (dateInput.value) updateTimeslots(dateInput.value);
});
