const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'ADMIN') {
    window.location.href = '/login.html';
}

let map;
let allReports = [];
let allUsers = [];
let currentReportId = null;

document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupLogout();
    setupSearch();
    setupModal();
    setupSettings();

    try {
        await Promise.all([
            fetchReports(),
            fetchLogs(),
            fetchUsers()
        ]);

        updateStats(allReports);
        initMap(allReports);
        renderTable(allReports);
        renderUsersTable(allUsers);

    } catch (err) {
        console.error(err);
        if (err.message === 'Failed to fetch reports') {
            alert('Session expired. Please login again.');
            window.location.href = '/login.html';
        }
    }
});

function setupNavigation() {
    const navItems = ['dashboard', 'users', 'settings'];
    navItems.forEach(item => {
        const navLink = document.getElementById(`nav-${item}`);
        if (navLink) {
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(el => {
                    el.classList.remove('bg-primary/10', 'text-emerald-700', 'dark:text-primary', 'font-bold');
                    el.classList.add('text-slate-500');
                });
                navLink.classList.remove('text-slate-500');
                navLink.classList.add('bg-primary/10', 'text-emerald-700', 'dark:text-primary', 'font-bold');

                document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
                const view = document.getElementById(`view-${item}`);
                if (view) view.classList.remove('hidden');
            });
        }
    });
    document.getElementById('nav-dashboard')?.click();
}

function setupLogout() {
    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allReports.filter(r =>
                (r.address && r.address.toLowerCase().includes(term)) ||
                (r.id && r.id.toLowerCase().includes(term)) ||
                (r.status && r.status.toLowerCase().includes(term))
            );
            renderTable(filtered);
        });
    }
}

function setupSettings() {
    const form = document.getElementById('admin-settings-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Saving...';
            btn.disabled = true;

            setTimeout(() => {
                btn.textContent = 'Saved!';
                btn.classList.add('bg-green-600');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.classList.remove('bg-green-600');
                    alert('Settings saved successfully (Simulation)');
                }, 1000);
            }, 800);
        });
    }
}

// --- Data Fetching ---

async function fetchReports() {
    const res = await fetch('/reports/all', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to fetch reports');
    allReports = await res.json();
}

async function fetchLogs() {
    try {
        const res = await fetch('/admin/logs', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) renderLogs(await res.json());
    } catch (err) { console.error(err); }
}

async function fetchUsers() {
    try {
        const res = await fetch('/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) allUsers = await res.json();
    } catch (err) { console.error(err); }
}

// --- Rendering ---

function renderTable(reports) {
    const tbody = document.getElementById('verification-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No reports found</td></tr>';
        return;
    }

    reports.forEach(report => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer';

        tr.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                openReportModal(report.id);
            }
        });

        const date = new Date(report.created_at).toLocaleString();
        let statusBadge = getStatusBadge(report.status);

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="text-sm font-semibold">#${report.id.slice(0, 8)}</div>
                <div class="text-xs text-slate-500">${date}</div>
            </td>
            <td class="px-6 py-4">
                ${report.image_url ?
                `<img class="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700" src="${report.image_url}">` :
                '<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">No Img</div>'}
            </td>
            <td class="px-6 py-4">
                <div class="text-sm truncate w-48">${report.address || 'Unknown'}</div>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs font-bold capitalize">${report.severity}</span>
            </td>
            <td class="px-6 py-4">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="openReportModal('${report.id}')" class="text-sm font-bold text-primary hover:text-emerald-700">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 dark:border-slate-800';
        const date = new Date(u.created_at).toLocaleDateString();

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-sm">${u.name}</div>
                <div class="text-xs text-slate-500">${u.email}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">${u.role}</span>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500">${date}</td>
            <td class="px-6 py-4 text-right">
                ${u.id !== user.id ?
                `<button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>` :
                '<span class="text-xs text-slate-400">You</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLogs(logs) {
    const container = document.getElementById('admin-activity-log');
    if (!container) return;
    container.innerHTML = '';

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic">No recent activity.</p>';
        return;
    }

    logs.forEach(log => {
        const timeAgo = new Date(log.timestamp).toLocaleString();
        let icon = 'edit';
        let color = 'text-blue-600 bg-blue-100';

        if (log.action === 'VERIFIED') { icon = 'task_alt'; color = 'text-primary bg-primary/20'; }
        if (log.action === 'REJECTED') { icon = 'block'; color = 'text-red-600 bg-red-100'; }

        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 mb-3';
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0">
                <span class="material-icons text-sm">${icon}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm truncate"><strong>${log.admin_name}</strong> ${log.action.toLowerCase()} report</p>
                <p class="text-xs text-slate-400">${timeAgo}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateStats(reports) {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'PENDING').length;
    const critical = reports.filter(r => r.severity === 'HIGH' && r.status !== 'RESOLVED').length;
    const cleared = reports.filter(r => r.status === 'RESOLVED').length;

    document.getElementById('stat-total').textContent = total.toLocaleString();
    document.getElementById('stat-pending').textContent = pending.toLocaleString();

    const spotEl = document.getElementById('stat-hotspots');
    if (spotEl) spotEl.textContent = critical;

    const clearEl = document.getElementById('stat-cleared');
    if (clearEl) clearEl.textContent = cleared;
}

// --- Modal Logic ---

window.openReportModal = async (reportId) => {
    currentReportId = reportId;
    const modal = document.getElementById('report-modal');
    modal.classList.remove('hidden');

    document.getElementById('modal-address').textContent = 'Loading...';

    try {
        const res = await fetch(`/admin/report/${reportId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load details');
        const report = await res.json();

        document.getElementById('modal-address').textContent = report.address;
        document.getElementById('modal-coords').textContent = `${report.latitude}, ${report.longitude}`;
        document.getElementById('modal-reporter').textContent = report.user_name || 'Unknown User';
        document.getElementById('modal-email').textContent = report.user_email || 'No Email';
        document.getElementById('modal-notes').textContent = report.admin_notes || "No additional notes.";
        document.getElementById('modal-map-link').href = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;

        const badge = document.getElementById('modal-status-badge');
        badge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(report.status)}`;
        badge.textContent = report.status;

        const img = document.getElementById('modal-image');
        const noImg = document.getElementById('modal-no-image');
        const link = document.getElementById('modal-image-link');

        if (report.image_url) {
            img.src = report.image_url;
            img.classList.remove('hidden');
            noImg.classList.add('hidden');
            link.href = report.image_url;
        } else {
            img.classList.add('hidden');
            noImg.classList.remove('hidden');
        }

        setupModalButtons(report.id);

    } catch (err) {
        console.error(err);
        alert('Could not load report details');
        closeReportModal();
    }
};

function setupModalButtons(id) {
    document.getElementById('btn-verify').onclick = () => updateStatus(id, 'verify');
    document.getElementById('btn-reject').onclick = () => updateStatus(id, 'reject');
    document.getElementById('btn-resolve').onclick = () => updateStatus(id, 'resolve');
}

function setupModal() {
    const modal = document.getElementById('report-modal');
    document.getElementById('close-modal').addEventListener('click', closeReportModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeReportModal();
    });
}

function closeReportModal() {
    document.getElementById('report-modal').classList.add('hidden');
    currentReportId = null;
}

// --- Actions ---

window.updateStatus = async (id, action) => {
    if (!confirm(`Are you sure you want to ${action} this report?`)) return;

    try {
        const res = await fetch(`/admin/reports/${id}/${action}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: `Action: ${action} by Admin` })
        });

        if (res.ok) {
            closeReportModal();
            location.reload();
        } else {
            alert('Action failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating status');
    }
};

window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
        const res = await fetch(`/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            allUsers = allUsers.filter(u => u.id !== id);
            renderUsersTable(allUsers);
        } else {
            alert('Failed to delete user');
        }
    } catch (err) { console.error(err); }
};

// --- Helpers ---

function getStatusBadge(status) {
    if (status === 'PENDING') return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>`;
    if (status === 'VERIFIED') return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Verified</span>`;
    if (status === 'REJECTED') return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</span>`;
    if (status === 'RESOLVED') return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Resolved</span>`;
    return '<span>Unknown</span>';
}

function getStatusColor(status) {
    if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
    if (status === 'VERIFIED') return 'bg-green-100 text-green-800';
    if (status === 'REJECTED') return 'bg-red-100 text-red-800';
    if (status === 'RESOLVED') return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100';
}

async function initMap(reports) {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const mapContainer = document.getElementById("admin-map");
    const center = { lat: 20.5937, lng: 78.9629 };

    map = new Map(mapContainer, {
        center: center,
        zoom: 4,
        mapId: 'ADMIN_MAP_ID',
        disableDefaultUI: true,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        ]
    });

    reports.forEach(report => {
        new AdvancedMarkerElement({
            map: map,
            position: { lat: report.latitude, lng: report.longitude },
            title: report.status
        });
    });
}
