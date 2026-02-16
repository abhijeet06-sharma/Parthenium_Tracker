const token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

let map;
let myReports = [];
let allMarkers = [];

document.addEventListener('DOMContentLoaded', async () => {
    setupLogout();
    setupNavigation();
    setupSearch();
    setupMobileSidebar();

    try {
        await checkAuth();
        await fetchReports();
        updateUI();
    } catch (err) {
        console.error(err);
        if (err.message === 'Unauthorized') {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
    }
});

function setupLogout() {
    const logoutBtn = document.getElementById('user-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }
}

function setupNavigation() {
    const navItems = ['map', 'reports', 'impact', 'education', 'community'];

    navItems.forEach(item => {
        const navLink = document.getElementById(`nav-${item}`);
        if (navLink) {
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Update Nav State
                document.querySelectorAll('.nav-item').forEach(el => {
                    el.classList.remove('bg-primary/10', 'text-emerald-700', 'dark:text-primary');
                    el.classList.add('text-slate-500');
                });
                navLink.classList.remove('text-slate-500');
                navLink.classList.add('bg-primary/10', 'text-emerald-700', 'dark:text-primary');

                // Update View State
                document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
                const view = document.getElementById(`view-${item}`);
                if (view) view.classList.remove('hidden');

                // Special handling
                if (item === 'map' && map) {
                    // Resize map if needed
                }
            });
        }
    });

    // Default to map
    document.getElementById('nav-map')?.click();
}

function setupSearch() {
    const searchInput = document.getElementById('dashboard-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = myReports.filter(r =>
                (r.address && r.address.toLowerCase().includes(term)) ||
                (r.id && r.id.toLowerCase().includes(term)) ||
                (r.status && r.status.toLowerCase().includes(term))
            );
            updateMap(filtered);
            renderActivity(filtered);
            renderReportsList(filtered);
        });
    }
}

async function checkAuth() {
    const authRes = await fetch('/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!authRes.ok) throw new Error('Unauthorized');
    return await authRes.json();
}

async function fetchReports() {
    const reportsRes = await fetch('/reports/my', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!reportsRes.ok) throw new Error('Failed to fetch reports');
    myReports = await reportsRes.json();
}

function updateUI() {
    // Stats
    document.getElementById('total-reports').textContent = myReports.length;
    const verifiedCount = myReports.filter(r => r.status === 'VERIFIED').length;
    document.getElementById('verified-reports').textContent = verifiedCount;

    // Impact View Stats
    const totalEl = document.getElementById('impact-total');
    if (totalEl) totalEl.textContent = myReports.length;
    const verifiedEl = document.getElementById('impact-verified');
    if (verifiedEl) verifiedEl.textContent = verifiedCount;

    // Ranking
    updateRanking(myReports.length);

    // Lists & Map
    renderActivity(myReports);
    renderReportsList(myReports);
    renderActivity(myReports);
    renderReportsList(myReports);
    // Map disabled per user request to show static background image
    // initMap(myReports);
}

function updateRanking(count) {
    let rank = "Eco Scout";
    let nextRank = "Green Guardian";
    let target = 5;
    let prevTarget = 0;

    if (count >= 5) {
        rank = "Green Guardian";
        nextRank = "Bio-Warrior";
        target = 20;
        prevTarget = 5;
    }
    if (count >= 20) {
        rank = "Bio-Warrior";
        nextRank = "Nature Defender";
        target = 50;
        prevTarget = 20;
    }
    if (count >= 50) {
        rank = "Nature Defender";
        nextRank = "Legend";
        target = 100;
        prevTarget = 50;
    }

    const progress = Math.min(100, Math.round(((count - prevTarget) / (target - prevTarget)) * 100));

    document.getElementById('rank-next-name').textContent = nextRank;
    document.getElementById('rank-next-percent').textContent = `${progress}%`;
    document.getElementById('rank-progress-bar').style.width = `${progress}%`;
    document.getElementById('rank-current-count').textContent = count;
    document.getElementById('rank-next-target').textContent = target;
}

function renderActivity(reports) {
    const activityContainer = document.getElementById('recent-activity');
    if (!activityContainer) return;
    activityContainer.innerHTML = '';

    if (reports.length === 0) {
        activityContainer.innerHTML = '<p class="text-sm text-slate-500 italic">No recent reports found.</p>';
        return;
    }

    reports.slice(0, 5).forEach(report => {
        const card = createReportCard(report, true);
        activityContainer.appendChild(card);
    });
}

function renderReportsList(reports) {
    const container = document.getElementById('reports-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (reports.length === 0) {
        container.innerHTML = '<p class="text-slate-500 italic">You haven\'t submitted any reports yet.</p>';
        return;
    }

    reports.forEach(report => {
        const card = createReportCard(report, false);
        container.appendChild(card);
    });
}

function createReportCard(report, isCompact) {
    const div = document.createElement('div');
    const classes = isCompact
        ? 'group bg-slate-50 dark:bg-emerald-900/10 hover:bg-white dark:hover:bg-emerald-900/30 p-4 rounded-2xl border border-transparent hover:border-primary/20 transition-all cursor-pointer'
        : 'bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4';

    div.className = classes;
    const date = new Date(report.created_at).toLocaleDateString();

    let statusColor = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    if (report.status === 'VERIFIED') statusColor = 'bg-primary/20 text-emerald-700 dark:text-primary';
    if (report.status === 'REJECTED') statusColor = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    if (report.status === 'RESOLVED') statusColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';

    if (isCompact) {
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="px-2.5 py-1 ${statusColor} text-[10px] font-bold uppercase rounded-full">${report.status}</span>
                <span class="text-[10px] text-slate-400 font-medium">${date}</span>
            </div>
            <h4 class="font-bold text-slate-800 dark:text-slate-200">${report.address || 'Unknown Location'}</h4>
            <p class="text-xs text-slate-500 mb-2">Severity: ${report.severity}</p>
        `;
    } else {
        div.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-3 py-1 ${statusColor} text-xs font-bold uppercase rounded-full">${report.status}</span>
                    <span class="text-sm text-slate-400 font-medium">${date}</span>
                </div>
                <h4 class="font-bold text-lg text-slate-800 dark:text-slate-200 mb-1">${report.address || 'Unknown Location'}</h4>
                <p class="text-sm text-slate-500">ID: ${report.id}</p>
            </div>
             <div class="text-right">
                <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Severity: <span class="font-bold text-slate-800 dark:text-white">${report.severity}</span></p>
            </div>
        `;
    }
    return div;
}

async function initMap(reports) {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const mapContainer = document.getElementById("map-container");
    if (!mapContainer) return;

    const center = { lat: 20.5937, lng: 78.9629 };
    if (reports.length > 0) {
        center.lat = reports[0].latitude;
        center.lng = reports[0].longitude;
    }

    map = new Map(mapContainer, {
        center: center,
        zoom: 5,
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: true,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
            { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b2a6" }] },
            { featureType: "administrative.land_parcel", elementType: "geometry.stroke", stylers: [{ color: "#dcd2be" }] },
            { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#ae9e90" }] },
            { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#93817c" }] },
            { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#a5b076" }] },
            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#447530" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
            { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfcf8" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f8c967" }] },
            { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e9bc62" }] },
            { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#e98d58" }] },
            { featureType: "road.highway.controlled_access", elementType: "geometry.stroke", stylers: [{ color: "#db8555" }] },
            { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#806b63" }] },
            { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
            { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
            { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b9d3c2" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#92998d" }] }
        ]
    });

    updateMap(reports);
}

async function updateMap(reports) {
    if (!map) return;
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    // Clear markers would be cleaner if we tracked them, but re-init works for this complexity
    // Actually, we can just clear markers if we track them. but we aren't tracking them in a clearable way easily without more changes.
    // For now, let's just add new ones (it might duplicate if not cleared, but re-init map handles clearing)

    // Wait, initMap creates a NEW map instance, so it clears everything.
    // updateMap is CALLED by initMap.

    // If called from Search, we probably want to clear markers.
    // But since we don't have a clearMarkers function, let's call initMap again?
    // While expensive, it's safe.

    // Actually, look at line 30 in original: updateMap(filtered) 
    // If updateMap just adds markers, the old ones remain.
    // So the search filter wouldn't work visually (all pins would stay).

    // Correction: I should make updateMap clear markers.
    // I'll add a simple global `allMarkers` array.

    allMarkers.forEach(m => m.map = null);
    allMarkers = [];

    reports.forEach(report => {
        const marker = new AdvancedMarkerElement({
            map: map,
            position: { lat: report.latitude, lng: report.longitude },
            title: report.address
        });
        allMarkers.push(marker);
    });
}

function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-40 hidden lg:hidden glass-overlay';
    document.body.appendChild(overlay);

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Close when clicking a nav item on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 1024) closeSidebar();
        });
    });
}
