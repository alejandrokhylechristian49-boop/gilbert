// ================= SESSION CHECK =================
if (sessionStorage.getItem("isLoggedIn") !== "true") {
    window.location.replace("loginadmin");
}

// ================= THEME FUNCTIONS =================
function applyTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('adminTheme', isDark ? 'dark' : 'light');
    const checkbox = document.getElementById('themeCheckbox');
    if (checkbox) checkbox.checked = isDark;
}

function toggleTheme(isDark) {
    applyTheme(isDark);
}

// Sync theme on load
(function() {
    const saved = localStorage.getItem('adminTheme') || 'light';
    const isDark = saved === 'dark';
    const checkbox = document.getElementById('themeCheckbox');
    if (checkbox) checkbox.checked = isDark;
    applyTheme(isDark);
})();

// Theme toggle event
const themeCheckbox = document.getElementById('themeCheckbox');
if (themeCheckbox) {
    themeCheckbox.addEventListener('change', function(e) {
        toggleTheme(e.target.checked);
    });
}

// ================= HAMBURGER MENU =================
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', function() {
        const isOpen = mobileMenu.classList.contains('active');
        mobileMenu.classList.toggle('active', !isOpen);
        hamburgerBtn.classList.toggle('active', !isOpen);
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.mobile-item').forEach(el => {
    el.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    });
});

// ================= LOGOUT FUNCTIONS =================
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('active');
    }
    // Close mobile menu if open
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmLogout() {
    sessionStorage.removeItem("isLoggedIn");
    window.location.replace("loginadmin");
}

// Logout button event listeners
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', showLogoutModal);
if (desktopLogoutBtn) desktopLogoutBtn.addEventListener('click', showLogoutModal);
if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', closeLogoutModal);
if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', confirmLogout);

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('logoutModal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
        closeLogoutModal();
    }
});

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLogoutModal();
    }
});

// ================= GLOBAL VARIABLES =================
let db, auth;
let lastHeartbeat = {};
let trueFirebaseStatus = {};
let allDispenserStatuses = {};
let complaints = [];
let complaintsMap = {};
let lastDispenserTime = {};
let selectedDispenserId = null;
let selectedDispenserOutline = null;
let selectedFromComplaint = false;

// THREE.JS Variables
let scene, camera, renderer;
let dispensers3D = [];
let sceneReady = false;
let pendingStatusUpdates = {};
let controls3D = { mouseDown: false, mouseX: 0 };
let modelsLoaded = { building: false, tiles: false, lights: false, doors: false, windows: false, columns: false, dispensers: false };
let buildingReference = null;

// Camera constants
const CAM_POS_X = 10.19;
const CAM_POS_Y = 6.79;
const CAM_Z_MIN = -7.40;
const CAM_Z_MAX = 12.20;
let cameraZ = (CAM_Z_MIN + CAM_Z_MAX) / 2;
const LOOK_OFFSET_X = -10;

// Constants
const OUTLINE_COLOR = 0x353ba7;
const COMPLAINT_OUTLINE_COLOR = 0xdc3545;

// Status mappings
const statusColors = {
    0: 0x808080, 1: 0xff4444, 2: 0xCC0000, 3: 0xffeb3b, 4: 0x4CAF50
};

const statusNames = {
    0: 'Offline', 1: 'Empty', 2: 'Critical', 3: 'Mid', 4: 'Full'
};

const statusClasses = {
    0: 'status-offline', 1: 'status-empty', 2: 'status-critical',
    3: 'status-mid', 4: 'status-full'
};

const statusSortOrder = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };

const firebaseStatusToLocal = {
    'FULL': 4, 'MID': 3, 'CRITICAL': 2, 'EMPTY': 1, 'OFFLINE': 0,
    'Full': 4, 'Mid': 3, 'Critical': 2, 'Empty': 1, 'Offline': 0, 'offline': 0,
    'full': 4, 'mid': 3, 'critical': 2, 'empty': 1
};

const dispenserInfo = {
    'DSP_1': { location: 'Floor 1 - Entrance', floor: 1 },
    'DSP_2': { location: 'Floor 1 - Computer Lab 1', floor: 1 },
    'DSP_3': { location: 'Floor 1 - Computer Lab 2', floor: 1 },
    'DSP_4': { location: 'Floor 2 - Computer Lab 4', floor: 2 },
    'DSP_5': { location: 'Floor 2 - Computer Lab 5', floor: 2 },
    'DSP_6': { location: 'Floor 2 - Front Left', floor: 2 },
    'DSP_7': { location: 'Floor 2 - COE Office', floor: 2 },
    'DSP_8': { location: 'Floor 3 - Front Right', floor: 3 },
    'DSP_9': { location: 'Floor 3 - Back Right', floor: 3 },
    'DSP_10': { location: 'Floor 3 - Front Left', floor: 3 },
    'DSP_11': { location: 'Floor 3 - Back Left', floor: 3 },
    'DSP_12': { location: 'Floor 4 - Event Hall Right', floor: 4 },
    'DSP_13': { location: 'Floor 4 - Event Hall Left', floor: 4 }
};

const dispenserPositions = [
    { id: 1, x: -1.5, y: 2.0, z: 4, rotation: 0, scale: 0.25, status: 0, floor: 1, name: "Floor 1 - Entrance" },
    { id: 2, x: -4.8, y: 2.0, z: -8, rotation: 90, scale: 0.25, status: 0, floor: 1, name: "Floor 1 - Front Right" },
    { id: 3, x: -4.8, y: 2.0, z: -16, rotation: 90, scale: 0.25, status: 0, floor: 1, name: "Floor 1 - Back Right" },
    // SWAPPED: DSP_4 (Computer Lab 4) now at Front Left position (was DSP_6)
    { id: 4, x: -4.8, y: 3.80, z: 14, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Front Left" },
    // SWAPPED: DSP_5 (Computer Lab 5) now at Back Left position (was DSP_7)
    { id: 5, x: -4.8, y: 3.80, z: 21.5, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Back Left" },
    // SWAPPED: DSP_6 (Front Left) now at Front Right position (was DSP_4)
    { id: 6, x: -4.8, y: 3.80, z: -8, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Front Right" },
    // SWAPPED: DSP_7 (COE Office) now at Back Right position (was DSP_5)
    { id: 7, x: -4.8, y: 3.80, z: -16, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Back Right" },
    { id: 8, x: -4.8, y: 5.50, z: -8, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Front Right" },
    { id: 9, x: -4.8, y: 5.50, z: -16, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Back Right" },
    { id: 10, x: -4.8, y: 5.50, z: 14, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Front Left" },
    { id: 11, x: -4.8, y: 5.50, z: 21.5, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Back Left" },
    { id: 12, x: -4.8, y: 7.30, z: 17.5, rotation: 90, scale: 0.25, status: 0, floor: 4, name: "Floor 4 - Event Hall Right" },
    { id: 13, x: -10, y: 7.30, z: 17.5, rotation: 270, scale: 0.25, status: 0, floor: 4, name: "Floor 4 - Event Hall Left" },
];

// ================= UTILITY FUNCTIONS =================
function escapeHtml(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ================= FIREBASE INITIALIZATION =================
async function initializeFirebase() {
    try {
        const response = await fetch('/api/config');
        const firebaseConfig = await response.json();

        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();

        auth.signInAnonymously()
            .then(() => {
                console.log("Signed in successfully");
                init3D();
                loadDashboardData();
            })
            .catch((error) => {
                console.error("Auth error:", error);
                document.getElementById('loading').style.display = 'none';
                alert("Authentication failed. Please refresh.");
            });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        document.getElementById('loading').style.display = 'none';
        alert("Failed to connect to database. Please refresh the page.");
    }
}

// ================= DASHBOARD DATA LOADING =================
function loadDashboardData() {
    function effectiveStatus(id) {
        const hb = lastHeartbeat[id];
        const isOnline = hb && (Date.now() - hb <= 70000);
        return isOnline ? (trueFirebaseStatus[id] ?? 0) : 0;
    }

    db.ref("dispenser").on("value", snap => {
        const data = snap.val() || {};
        Object.keys(data).forEach(id => {
            const d = data[id] || {};
            trueFirebaseStatus[id] = firebaseStatusToLocal[d.status || ''] ?? 0;
            lastDispenserTime[id] = d.time || '—';
        });
        Object.keys(trueFirebaseStatus).forEach(id => {
            allDispenserStatuses[id] = effectiveStatus(id);
        });
        renderStatusCards();
        Object.entries(allDispenserStatuses).forEach(([dId, s]) => {
            const m = dId.match(/DSP_(\d+)/i);
            if (m) updateDispenser3DStatus(parseInt(m[1]), s);
        });
        document.getElementById('loading').style.display = 'none';
    });

    db.ref("heartbeat").on("value", snap => {
        const data = snap.val() || {};
        const now = Date.now();

        Object.keys(data).forEach(id => {
            const d = data[id];
            if (d && d.epoch !== undefined) lastHeartbeat[id] = d.epoch;
        });

        let changed = false;
        Object.keys(trueFirebaseStatus).forEach(id => {
            const before = allDispenserStatuses[id] ?? -1;
            allDispenserStatuses[id] = effectiveStatus(id);
            if (allDispenserStatuses[id] !== before) changed = true;
            const m = id.match(/DSP_(\d+)/i);
            if (m) updateDispenser3DStatus(parseInt(m[1]), allDispenserStatuses[id]);
        });

        if (changed) {
            renderStatusCards();
        }
    });

    db.ref("complaints").on("value", snap => {
        const complaintsData = snap.val() || {};
        complaints = Object.entries(complaintsData).map(([id, v]) => ({ id, ...v }));
        complaintsMap = {};
        complaints.forEach(c => {
            if (!complaintsMap[c.dispenser_id]) complaintsMap[c.dispenser_id] = [];
            complaintsMap[c.dispenser_id].push(c);
        });
        renderComplaints();
        renderStatusCards();
        if (selectedDispenserId && selectedFromComplaint) {
            const match = selectedDispenserId.match(/DSP_(\d+)/i);
            if (match) highlightDispenser(parseInt(match[1]), true);
        }
    });

    setInterval(() => {
        let changed = false;
        Object.keys(trueFirebaseStatus).forEach(id => {
            const before = allDispenserStatuses[id] ?? -1;
            allDispenserStatuses[id] = effectiveStatus(id);
            if (allDispenserStatuses[id] !== before) changed = true;
            const m = id.match(/DSP_(\d+)/i);
            if (m) updateDispenser3DStatus(parseInt(m[1]), allDispenserStatuses[id]);
        });
        if (changed) {
            renderStatusCards();
        }
    }, 1000);
}

function renderStatusCards() {
    const container = document.getElementById('statusCards');
    if (!container) return;
    container.innerHTML = '';
    const keys = Object.keys(allDispenserStatuses).sort((a, b) => {
        const diff = (statusSortOrder[allDispenserStatuses[a]] ?? 5) - (statusSortOrder[allDispenserStatuses[b]] ?? 5);
        return diff !== 0 ? diff : a.localeCompare(b, undefined, { numeric: true });
    });
    if (!keys.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No dispensers found</div>';
        return;
    }
    keys.forEach(id => {
        const s = allDispenserStatuses[id];
        const info = dispenserInfo[id] || { location: id };
        const cls = statusClasses[s] || 'status-offline';
        const name = statusNames[s] || 'Unknown';
        const isEmpty = s === 1;
        const hasComplaint = complaintsMap[id] && complaintsMap[id].length > 0;
        const isSelected = selectedDispenserId === id;
        container.innerHTML += `
            <div class="status-card ${isEmpty ? 'empty-highlight' : ''} ${isSelected ? 'selected-dispenser-card' : ''}" onclick="selectDispenser('${escapeHtml(id)}', false)">
                <div class="card-header">
                    <span>${escapeHtml(info.location)}</span>
                    <div>
                        ${isEmpty ? '<span class="refill-badge">NEEDS REFILL</span>' : ''}
                        ${hasComplaint ? '<span class="complaint-badge" style="background:#dc3545; margin-left:5px;">!</span>' : ''}
                    </div>
                </div>
                <div class="card-row">
                    <span class="card-label">Status:</span>
                    <span class="status-badge ${cls}">${escapeHtml(name)}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Last Update:</span>
                    <span class="card-value">${escapeHtml(lastDispenserTime[id] || '—')}</span>
                </div>
                <div class="click-hint">${isSelected ? 'Click to deselect' : 'Click to highlight in 3D'}</div>
            </div>`;
    });
}

function renderComplaints() {
    const container = document.getElementById('complaintsCards');
    if (!container) return;
    container.innerHTML = '';
    if (!complaints.length) {
        container.innerHTML = '<div class="empty-state">No complaints</div>';
        return;
    }
    complaints.forEach(c => {
        const isSelected = selectedDispenserId === c.dispenser_id && selectedFromComplaint;
        container.innerHTML += `
            <div class="complaint-card ${isSelected ? 'selected-dispenser-card' : ''}" onclick="selectDispenser('${escapeHtml(c.dispenser_id)}', true)">
                <div class="card-header">
                    <span>${escapeHtml(dispenserInfo[c.dispenser_id]?.location || 'Unknown Location')}</span>
                    <span class="complaint-badge">COMPLAINT</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Issue:</span>
                    <span class="card-value">${escapeHtml(c.issue)}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Time:</span>
                    <span class="card-value">${escapeHtml(c.timestamp)}</span>
                </div>
                ${c.details ? `<div class="card-row"><span class="card-label">Details:</span><span class="card-value">${escapeHtml(c.details)}</span></div>` : ''}
                <button class="resolve-btn" onclick="event.stopPropagation(); deleteComplaint('${c.id}')">Mark Resolved</button>
                <div class="click-hint">${isSelected ? 'Click to deselect' : 'Click to highlight complained dispenser'}</div>
            </div>`;
    });
}

window.selectDispenser = function(dispenserId, isFromComplaint = false) {
    if (selectedDispenserId === dispenserId) {
        selectedDispenserId = null;
        selectedFromComplaint = false;
        highlightDispenser(null);
    } else {
        selectedDispenserId = dispenserId;
        selectedFromComplaint = isFromComplaint;
        const match = dispenserId.match(/DSP_(\d+)/i);
        if (match) highlightDispenser(parseInt(match[1]), isFromComplaint);
    }
    renderStatusCards();
    renderComplaints();
};

window.deleteComplaint = function(id) {
    if (!confirm('Mark this complaint as resolved?')) return;
    db.ref('complaints/' + id).remove();
};

// ================= THREE.JS 3D SCENE =================
function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8b5c0);
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 25, 5);
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.2);
    fillLight.position.set(-10, 15, -10);
    scene.add(fillLight);

    loadBuildingModel();
    loadTilesModel();
    loadLightModel();
    loadDoorModel();
    loadWindowModel();
    loadColumnModel();
    loadDispenserModel();
    setup3DControls();
    window.addEventListener('resize', onWindowResize);
    animate3D();
}

function loadBuildingModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('PNC 3d model blender.glb', function(gltf) {
        const model = gltf.scene;
        model.traverse(function(node) {
            if (node.isMesh && node.visible) {
                const nodeName = node.name.toLowerCase();
                let color;
                if (nodeName.includes('wall') || nodeName.includes('floor') || nodeName.includes('ceiling') || nodeName.includes('stair')) {
                    color = 0x0B3D2E;
                } else {
                    color = 0xDED7CC;
                }
                node.material = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide, roughness: 0.6 });
            }
        });
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        model.scale.multiplyScalar(50 / Math.max(size.x, size.y, size.z));
        buildingReference = model;
        scene.add(model);
        modelsLoaded.building = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading building model:', error);
        modelsLoaded.building = true;
        checkLoadingComplete();
    });
}

function loadTilesModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('Tiles.glb', function(gltf) {
        const model = gltf.scene;
        model.traverse(function(node) {
            if (node.isMesh && node.visible) {
                node.material = new THREE.MeshStandardMaterial({ color: 0xD3D3D3, roughness: 0.25, metalness: 0.15, side: THREE.DoubleSide });
            }
        });
        if (buildingReference) {
            model.position.copy(buildingReference.position);
            model.scale.copy(buildingReference.scale);
            model.rotation.copy(buildingReference.rotation);
        }
        scene.add(model);
        modelsLoaded.tiles = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading tiles model:', error);
        modelsLoaded.tiles = true;
        checkLoadingComplete();
    });
}

function loadLightModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('LIGHT.glb', function(gltf) {
        const model = gltf.scene;
        if (buildingReference) {
            model.position.copy(buildingReference.position);
            model.scale.copy(buildingReference.scale);
            model.rotation.copy(buildingReference.rotation);
        }
        scene.add(model);
        modelsLoaded.lights = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading light model:', error);
        modelsLoaded.lights = true;
        checkLoadingComplete();
    });
}

function loadDoorModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('door.glb', function(gltf) {
        const model = gltf.scene;
        model.traverse(function(node) {
            if (node.isMesh && node.visible) {
                node.material = new THREE.MeshStandardMaterial({ color: 0xD3D3D3, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
            }
        });
        if (buildingReference) {
            model.position.copy(buildingReference.position);
            model.scale.copy(buildingReference.scale);
            model.rotation.copy(buildingReference.rotation);
        }
        scene.add(model);
        modelsLoaded.doors = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading door model:', error);
        modelsLoaded.doors = true;
        checkLoadingComplete();
    });
}

function loadWindowModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('window.glb', function(gltf) {
        const model = gltf.scene;
        model.traverse(function(node) {
            if (node.isMesh && node.visible) {
                node.material = new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.3 });
            }
        });
        if (buildingReference) {
            model.position.copy(buildingReference.position);
            model.scale.copy(buildingReference.scale);
            model.rotation.copy(buildingReference.rotation);
        }
        scene.add(model);
        modelsLoaded.windows = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading window model:', error);
        modelsLoaded.windows = true;
        checkLoadingComplete();
    });
}

function loadColumnModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('column.glb', function(gltf) {
        const model = gltf.scene;
        if (buildingReference) {
            model.position.copy(buildingReference.position);
            model.scale.copy(buildingReference.scale);
            model.rotation.copy(buildingReference.rotation);
        }
        scene.add(model);
        modelsLoaded.columns = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading column model:', error);
        modelsLoaded.columns = true;
        checkLoadingComplete();
    });
}

function loadDispenserModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('NEW DSP.glb', function(gltf) {
        dispenserPositions.forEach((pos, index) => {
            const dispenser = index === 0 ? gltf.scene : gltf.scene.clone();
            dispenser.position.set(pos.x, pos.y, pos.z);
            dispenser.scale.set(pos.scale, pos.scale, pos.scale);
            dispenser.rotation.y = (pos.rotation * Math.PI) / 180;
            dispenser.userData.status = pos.status;
            dispenser.userData.id = pos.id;
            dispenser.userData.name = pos.name;
            dispenser.traverse(function(node) {
                if (node.isMesh) {
                    const nodeName = node.name.toLowerCase();
                    if (nodeName.includes('pump') || nodeName.includes('cap')) {
                        node.material = new THREE.MeshStandardMaterial({ color: 0xe8b878, roughness: 0.3, metalness: 0.2 });
                    } else {
                        node.material = new THREE.MeshStandardMaterial({ color: statusColors[pos.status], roughness: 0.3, metalness: 0.1, emissive: statusColors[pos.status], emissiveIntensity: 0.1 });
                    }
                }
            });
            scene.add(dispenser);
            dispensers3D.push(dispenser);
        });
        modelsLoaded.dispensers = true;
        checkLoadingComplete();
    }, undefined, function(error) {
        console.error('Error loading dispenser model:', error);
        modelsLoaded.dispensers = true;
        checkLoadingComplete();
    });
}

function checkLoadingComplete() {
    if (modelsLoaded.building && modelsLoaded.tiles && modelsLoaded.lights &&
        modelsLoaded.doors && modelsLoaded.windows && modelsLoaded.columns &&
        modelsLoaded.dispensers) {
        document.getElementById('loading-3d').style.display = 'none';
        sceneReady = true;

        Object.entries(pendingStatusUpdates).forEach(([localId, statusValue]) => {
            updateDispenser3DStatus(Number(localId), statusValue);
        });
        pendingStatusUpdates = {};

        const now = Date.now();
        Object.keys(trueFirebaseStatus).forEach(dispenserId => {
            const match = dispenserId.match(/DSP_(\d+)/i);
            if (!match) return;
            const localId = parseInt(match[1]);
            const hb = lastHeartbeat[dispenserId];
            const isOnline = hb && (now - hb <= 70000);
            const effective = isOnline ? trueFirebaseStatus[dispenserId] : 0;
            updateDispenser3DStatus(localId, effective);
        });
    }
}

function updateDispenser3DStatus(dispenserId, statusValue) {
    if (!sceneReady) {
        pendingStatusUpdates[dispenserId] = statusValue;
        return;
    }

    const dispenser = dispensers3D.find(d => d.userData.id === dispenserId);
    if (!dispenser) return;
    dispenser.userData.status = statusValue;
    dispenser.traverse(function(node) {
        if (node.isMesh && !node.userData.isYouAreHereRing) {
            const nodeName = node.name.toLowerCase();
            if (!nodeName.includes('pump') && !nodeName.includes('cap')) {
                node.material.color.setHex(statusColors[statusValue]);
                node.material.emissive.setHex(statusColors[statusValue]);
                node.material.emissiveIntensity = 0.15;
            }
        }
    });
}

function highlightDispenser(localId, isFromComplaint = false) {
    if (selectedDispenserOutline) {
        scene.remove(selectedDispenserOutline);
        selectedDispenserOutline = null;
    }

    if (!localId) {
        document.getElementById('selectedDispenserInfo').style.display = 'none';
        document.getElementById('targetDispenserLabel').style.display = 'none';
        return;
    }

    const dispenser = dispensers3D.find(d => d.userData.id === localId);
    if (!dispenser) return;

    const outlineColor = isFromComplaint ? COMPLAINT_OUTLINE_COLOR : OUTLINE_COLOR;

    const box = new THREE.Box3().setFromObject(dispenser);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const padding = 0.05;
    size.x += padding;
    size.z += padding;
    size.y = Math.min(size.y, 1.5) + padding;
    center.y = box.min.y + size.y / 1.3;

    const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);

    const fillMat = new THREE.MeshBasicMaterial({
        color: outlineColor,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        side: THREE.FrontSide
    });
    const fillMesh = new THREE.Mesh(boxGeo, fillMat);
    fillMesh.position.copy(center);

    const edgeThickness = 0.031;
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const positions = edgesGeo.attributes.position;
    const edgeMat = new THREE.MeshBasicMaterial({ color: outlineColor });

    const edgesGroup = new THREE.Group();
    edgesGroup.position.copy(center);

    for (let i = 0; i < positions.count; i += 2) {
        const start = new THREE.Vector3().fromBufferAttribute(positions, i);
        const end = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
        const dir = new THREE.Vector3().subVectors(end, start);
        const length = dir.length();
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const tubeGeo = new THREE.CylinderGeometry(edgeThickness, edgeThickness, length, 6, 1);
        const tube = new THREE.Mesh(tubeGeo, edgeMat);
        tube.position.copy(mid);
        tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        edgesGroup.add(tube);
    }

    const group = new THREE.Group();
    group.userData.isOutline = true;
    group.add(fillMesh);
    group.add(edgesGroup);

    scene.add(group);
    selectedDispenserOutline = group;

    const dispId = `DSP_${localId}`;
    const info = dispenserInfo[dispId] || { location: 'Unknown' };
    const hasComplaint = complaintsMap[dispId] && complaintsMap[dispId].length > 0;

    document.getElementById('selectedDispenserName').textContent = dispId;
    document.getElementById('selectedDispenserLocation').textContent = info.location;

    const badgeEl = document.getElementById('selectedDispenserBadge');
    const infoPanel = document.getElementById('selectedDispenserInfo');
    const labelEl = document.getElementById('targetDispenserLabel');

    if (hasComplaint) {
        badgeEl.style.display = 'inline';
        infoPanel.classList.add('complaint-source');
        labelEl.classList.add('complaint-source');
    } else {
        badgeEl.style.display = 'none';
        infoPanel.classList.remove('complaint-source');
        labelEl.classList.remove('complaint-source');
    }

    infoPanel.style.display = 'block';
    labelEl.style.display = 'block';
    updateTargetDispenserLabel(localId);
}

function updateTargetDispenserLabel(localId) {
    if (!dispensers3D.length || !localId) return;
    const dispenser = dispensers3D.find(d => d.userData.id === localId);
    if (!dispenser) return;
    const label = document.getElementById('targetDispenserLabel');
    const container = document.getElementById('canvas-container');
    const pos3D = dispenser.position.clone();
    pos3D.project(camera);
    const x = (pos3D.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-pos3D.y * 0.5 + 0.5) * container.clientHeight;
    if (pos3D.z > 1 || x < 0 || x > container.clientWidth || y < 0 || y > container.clientHeight) {
        label.style.display = 'none';
        return;
    }
    label.style.display = 'block';
    label.style.left = (x + 20) + 'px';
    label.style.top = (y - 25) + 'px';
}

function setup3DControls() {
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', (e) => { controls3D.mouseDown = true; controls3D.mouseX = e.clientX; });
    canvas.addEventListener('mousemove', (e) => {
        if (!controls3D.mouseDown) return;
        slideZ((e.clientX - controls3D.mouseX) * 0.05);
        controls3D.mouseX = e.clientX;
    });
    canvas.addEventListener('mouseup', () => { controls3D.mouseDown = false; });
    canvas.addEventListener('mouseleave', () => { controls3D.mouseDown = false; });
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        slideZ(-(e.deltaX !== 0 ? e.deltaX : e.deltaY) * 0.02);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length >= 1) controls3D.mouseX = e.touches[0].clientX;
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length >= 1) {
            slideZ((e.touches[0].clientX - controls3D.mouseX) * 0.05);
            controls3D.mouseX = e.touches[0].clientX;
        }
    }, { passive: false });
}

function slideZ(delta) {
    cameraZ = Math.max(CAM_Z_MIN, Math.min(CAM_Z_MAX, cameraZ + delta));
}

function updateCamera() {
    cameraZ = Math.max(CAM_Z_MIN, Math.min(CAM_Z_MAX, cameraZ));
    camera.position.set(CAM_POS_X, CAM_POS_Y, cameraZ);
    camera.lookAt(CAM_POS_X + LOOK_OFFSET_X, CAM_POS_Y - 1, cameraZ);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

let emptyPulseTime = 0;
function animate3D() {
    requestAnimationFrame(animate3D);
    
    emptyPulseTime += 0.05;
    dispensers3D.forEach(d => {
        const id = `DSP_${d.userData.id}`;
        if (allDispenserStatuses[id] === 1) {
            d.traverse(node => {
                if (node.isMesh) {
                    const nodeName = node.name.toLowerCase();
                    if (!nodeName.includes('pump') && !nodeName.includes('cap')) {
                        node.material.emissiveIntensity = 0.2 + 0.3 * Math.abs(Math.sin(emptyPulseTime));
                    }
                }
            });
        }
    });

    updateCamera();
    if (selectedDispenserId) {
        const match = selectedDispenserId.match(/DSP_(\d+)/i);
        if (match) updateTargetDispenserLabel(parseInt(match[1]));
    }
    renderer.render(scene, camera);
}

// Start the app
document.body.classList.add('loaded');
initializeFirebase();
