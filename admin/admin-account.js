// admin-account.js
(function() {
    'use strict';

    const token = localStorage.getItem('akmark_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
    if (admin.full_name) {
        document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
    }

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        alert('Supabase config missing!');
        return;
    }

    const toastContainer = document.getElementById('toastContainer');

    // ===== TOAST =====
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i></div>
            <div>
                <div class="toast-title">${type === 'success' ? 'Success' : 'Error'}</div>
                <div class="toast-msg">${message}</div>
            </div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    function formatCurrency(amount) {
        return 'MWK ' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ===== LOAD PROFILE =====
    async function loadProfile() {
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-account-api?action=get_profile`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load profile');

            const a = data.admin;

            // Update UI
            document.getElementById('profileName').textContent = a.full_name || '—';
            document.getElementById('profileEmail').textContent = a.email || '—';
            document.getElementById('profileWallet').textContent = formatCurrency(a.wallet_balance);
            document.getElementById('profileEarnings').textContent = formatCurrency(a.total_earnings);

            const pinStatus = document.getElementById('pinStatus');

            if (a.has_pin) {
                pinStatus.textContent = 'PIN Set ✅';
                pinStatus.className = 'badge-status ok';
                document.getElementById('setPinForm').style.display = 'none';
                document.getElementById('changePinForm').style.display = 'block';
            } else {
                pinStatus.textContent = 'Not Set ❌';
                pinStatus.className = 'badge-status no';
                document.getElementById('setPinForm').style.display = 'block';
                document.getElementById('changePinForm').style.display = 'none';
            }

            // Update localStorage
            localStorage.setItem('akmark_admin', JSON.stringify({
                ...admin,
                full_name: a.full_name,
                email: a.email,
                wallet_balance: a.wallet_balance,
                total_earnings: a.total_earnings,
                has_pin: a.has_pin
            }));

        } catch (e) {
            showToast(e.message, 'error');
        }
    }

    // ===== SET PIN =====
    document.getElementById('setPinBtn').addEventListener('click', async function() {
        const pin = document.getElementById('setPinInput').value.trim();
        const confirm = document.getElementById('setPinConfirm').value.trim();

        if (!/^\d{4,6}$/.test(pin)) { showToast('PIN must be 4-6 digits', 'error'); return; }
        if (pin !== confirm) { showToast('PINs do not match', 'error'); return; }

        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Setting...';

        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-account-api?action=set_pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

            showToast('PIN set successfully ✅');
            document.getElementById('setPinInput').value = '';
            document.getElementById('setPinConfirm').value = '';
            await loadProfile();
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-lock-fill"></i> Set PIN';
        }
    });

    // ===== CHANGE PIN =====
    document.getElementById('changePinBtn').addEventListener('click', async function() {
        const oldPin = document.getElementById('oldPinInput').value.trim();
        const newPin = document.getElementById('newPinInput').value.trim();
        const confirmNew = document.getElementById('confirmNewPinInput').value.trim();

        if (!/^\d{4,6}$/.test(oldPin)) { showToast('Old PIN must be 4-6 digits', 'error'); return; }
        if (!/^\d{4,6}$/.test(newPin)) { showToast('New PIN must be 4-6 digits', 'error'); return; }
        if (newPin !== confirmNew) { showToast('New PINs do not match', 'error'); return; }
        if (oldPin === newPin) { showToast('New PIN must be different from old PIN', 'error'); return; }

        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Changing...';

        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-account-api?action=change_pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ old_pin: oldPin, new_pin: newPin })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

            showToast('PIN changed successfully ✅');
            document.getElementById('oldPinInput').value = '';
            document.getElementById('newPinInput').value = '';
            document.getElementById('confirmNewPinInput').value = '';
            await loadProfile();
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-arrow-repeat"></i> Change PIN';
        }
    });

    // ===== LOGOUT =====
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('akmark_admin_token');
        localStorage.removeItem('akmark_admin_refresh_token');
        localStorage.removeItem('akmark_admin');
        window.location.href = 'admin-login.html';
    });

    // ===== INIT =====
    loadProfile();
})();
