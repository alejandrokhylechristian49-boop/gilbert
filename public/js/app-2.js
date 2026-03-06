// ================= THEME FUNCTIONS =================
function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('userTheme', isDark ? 'dark' : 'light');
  document.getElementById('themeCheckbox').checked = isDark;
}

function toggleTheme(isDark) { 
  applyTheme(isDark); 
}

// Sync theme on load
(function() {
  const saved = localStorage.getItem('userTheme') || 'light';
  const isDark = saved === 'dark';
  document.getElementById('themeCheckbox').checked = isDark;
  applyTheme(isDark);
})();

// Add event listener for theme toggle
document.getElementById('themeCheckbox').addEventListener('change', function(e) {
  toggleTheme(e.target.checked);
});

// ================= GLOBAL VARIABLES =================
let db, auth;
const SELECTED_DISPENSER_ID = 'DSP_3';  // Changed to DSP_2
const SELECTED_DISPENSER_NUM = 3;       // NEW - numeric ID for this dispenser
let currentDispenserStatus = 0;
let hasActiveComplaint = false;
let allDispenserStatuses = {};
let trueFirebaseStatus = {};
let nearestDispenserId = null;
let lastHeartbeat = {};
let isOverlayMinimized = false;
let manualRoutedDispenserId = null;

// THREE.JS Variables
let scene, camera, renderer, buildingModel, tilesModel, lightModel, doorModel, windowModel, columnModel;
let dispensers3D = [];
let guidePath = null;
let arrowIndicators = [];
let highlightedDispenserOutline = null;
const OUTLINE_COLOR_AUTO = 0x00cfff;
const OUTLINE_COLOR_MANUAL = 0x353ba7;
let waypointMarkers = [];
let showWaypointMarkers = false;
let modelsLoaded = { building: false, tiles: false, lights: false, doors: false, windows: false, columns: false, dispensers: false };
let sceneReady = false;
let pendingStatusUpdates = {};
let controls3D = { mouseDown: false, mouseX: 0 };

// Camera constants
const CAM_POS_X = 10.19;
const CAM_POS_Y = 6.79;
const CAM_Z_MIN = -7.40;
const CAM_Z_MAX = 12.20;
let cameraZ = (CAM_Z_MIN + CAM_Z_MAX) / 2;
const LOOK_OFFSET_X = -10;

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let touchState = {
  touches: [],
  lastDistance: 0,
  rotating: false,
  panning: false
};

// Status mappings
const statusColors = {
  0: 0x808080, 1: 0xff4444, 2: 0xff9800, 3: 0xffeb3b, 4: 0x4CAF50
};

const statusNames = {
  0: 'Offline', 1: 'Empty', 2: 'Critical', 3: 'Mid', 4: 'Full'
};

const statusClasses = {
  0: 'status-offline', 1: 'status-empty', 2: 'status-critical', 
  3: 'status-mid', 4: 'status-full'
};

const firebaseStatusToLocal = {
  'FULL': 4, 'MID': 3, 'CRITICAL': 2, 'EMPTY': 1, 'OFFLINE': 0,
  'Full': 4, 'Mid': 3, 'Critical': 2, 'Empty': 1, 'Offline': 0, 'offline': 0,
  'full': 4, 'mid': 3, 'critical': 2, 'empty': 1
};

const dispenserInfo = {
  'DSP_1': { name: 'DSP_1', location: 'Floor 1 - Entrance', floor: 1 },
  'DSP_2': { name: 'DSP_2', location: 'Floor 1 - Computer Lab 1', floor: 1 },
  'DSP_3': { name: 'DSP_3', location: 'Floor 1 - Computer Lab 2', floor: 1 },
  'DSP_4': { name: 'DSP_4', location: 'Floor 2 - Front Right', floor: 2 },
  'DSP_5': { name: 'DSP_5', location: 'Floor 2 - Computer Lab 5', floor: 2 },
  'DSP_6': { name: 'DSP_6', location: 'Floor 2 - Front Left', floor: 2 },
  'DSP_7': { name: 'DSP_7', location: 'Floor 2 - COE Office', floor: 2 },
  'DSP_8': { name: 'DSP_8', location: 'Floor 3 - Front Right', floor: 3 },
  'DSP_9': { name: 'DSP_9', location: 'Floor 3 - Back Right', floor: 3 },
  'DSP_10': { name: 'DSP_10', location: 'Floor 3 - Front Left', floor: 3 },
  'DSP_11': { name: 'DSP_11', location: 'Floor 3 - Back Left', floor: 3 },
  'DSP_12': { name: 'DSP_12', location: 'Floor 4 - Event Hall Right', floor: 4 },
  'DSP_13': { name: 'DSP_13', location: 'Floor 4 - Event Hall Left', floor: 4 }
};

const dispenserPositions = [
  { id: 1, x: -1.5, y: 2.0, z: 4, rotation: 0, scale: 0.25, status: 0, floor: 1, name: "Floor 1 - Entrance" },
  { id: 2, x: -4.8, y: 2.0, z: -8, rotation: 90, scale: 0.25, status: 0, floor: 1, name: "Floor 1 - Front Right" },
  { id: 3, x: -4.8, y: 2.0, z: -16, rotation: 90, scale: 0.25, status: 0, floor: 1, name: "Floor 1 - Back Right" },
  { id: 4, x: -4.8, y: 3.80, z: -8, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Front Right" },
  { id: 5, x: -4.8, y: 3.80, z: -16, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Back Right" },
  { id: 6, x: -4.8, y: 3.80, z: 14, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Front Left" },
  { id: 7, x: -4.8, y: 3.80, z: 21.5, rotation: 90, scale: 0.25, status: 0, floor: 2, name: "Floor 2 - Back Left" },
  { id: 8, x: -4.8, y: 5.50, z: -8, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Front Right" },
  { id: 9, x: -4.8, y: 5.50, z: -16, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Back Right" },
  { id: 10, x: -4.8, y: 5.50, z: 14, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Front Left" },
  { id: 11, x: -4.8, y: 5.50, z: 21.5, rotation: 90, scale: 0.25, status: 0, floor: 3, name: "Floor 3 - Back Left" },
  { id: 12, x: -4.8, y: 7.30, z: 17.5, rotation: 90, scale: 0.25, status: 0, floor: 4, name: "Floor 4 - Event Hall Right" },
  { id: 13, x: -10, y: 7.30, z: 17.5, rotation: 270, scale: 0.25, status: 0, floor: 4, name: "Floor 4 - Event Hall Left" },
];

const dispenserToWaypoint = {
  1: 'f1_front_left', 2: 'f1_front_right', 3: 'f1_back',
  4: 'f2_center_junction', 5: 'f2_back', 6: 'f2_left2', 7: 'f2_left4',
  8: 'f3_center_junction', 9: 'f3_back', 10: 'f3_left2', 11: 'f3_left4',
  12: 'f4_left3', 13: 'f4_left3'
};

const dispenserOffsets = {
  1: new THREE.Vector3(0, 0, -1),
  2: new THREE.Vector3(-1.5, 0, 0), 3: new THREE.Vector3(-1.5, 0, 0),
  4: new THREE.Vector3(-1.5, 0, 0), 5: new THREE.Vector3(-1.5, 0, 0),
  6: new THREE.Vector3(-1.5, 0, 0), 7: new THREE.Vector3(-1.5, 0, 0),
  8: new THREE.Vector3(-1.5, 0, 0), 9: new THREE.Vector3(-1.5, 0, 0),
  10: new THREE.Vector3(-1.5, 0, 0), 11: new THREE.Vector3(-1.5, 0, 0),
  12: new THREE.Vector3(-1.5, 0, 0), 13: new THREE.Vector3(1.5, 0, 0)
};

const navWaypoints = {
  'f1_front_left': { pos: new THREE.Vector3(-2.2, 2.8, 2.9), floor: 1 },
  'f1_front_center': { pos: new THREE.Vector3(-6.5, 2.8, 3.75), floor: 1 },
  'f1_front_right': { pos: new THREE.Vector3(-6.5, 2.8, -8.25), floor: 1 },
  'f1_center_junction': { pos: new THREE.Vector3(-6.5, 2.8, -1.5), floor: 1 },
  'f1_junction_to_right': { pos: new THREE.Vector3(-6.5, 2.8, -4.9), floor: 1 },
  'f1_mid_hallway': { pos: new THREE.Vector3(-6.5, 2.8, -13.2), floor: 1 },
  'f1_back': { pos: new THREE.Vector3(-6.5, 2.8, -16.1), floor: 1 },
  'f1_stairs': { pos: new THREE.Vector3(-7.05, 2.8, 4.1), floor: 1 },
  'f1_rightstairs': { pos: new THREE.Vector3(-6.5, 2.8, -21.8), floor: 1 },
  'f1_left1': { pos: new THREE.Vector3(-6.5,2.8, 14), floor: 1 },
  'f1_left2': { pos: new THREE.Vector3(-6.5, 2.8, 18), floor: 1 },
  'f1_left3': { pos: new THREE.Vector3(-6.5, 2.8, 22.1), floor: 1 },
  'f1_left4': { pos: new THREE.Vector3(-6.5, 2.8, 25.5), floor: 1 },
  'stairs_1': { pos: new THREE.Vector3(-9.2, 2.8, 4.4), floor: 1.5 },
  'stairs_2': { pos: new THREE.Vector3(-11.2, 2.8, 3.5), floor: 1.5 },
  'stairs_3': { pos: new THREE.Vector3(-11.35, 3.0, 0), floor: 1.5 },
  'stairs_4': { pos: new THREE.Vector3(-9.75, 4.0, 0), floor: 1.5 },
  'stairs_5': { pos: new THREE.Vector3(-9.2, 2.8, -22.0), floor: 1.5 },
  'stairs_6': { pos: new THREE.Vector3(-11.6, 2.8, -22.0), floor: 1.5 },
  'stairs_7': { pos: new THREE.Vector3(-11.1, 2.5, -20.0), floor: 1.5 },
  'stairs_8': { pos: new THREE.Vector3(-8.5, 4.2, -20.1), floor: 1.5 },
  'stairs_9': { pos: new THREE.Vector3(-9.1, 2.8, 25.5), floor: 1.5 },
  'stairs_10': { pos: new THREE.Vector3(-10.7, 2.8, 25.5), floor: 1.5 },
  'stairs_11': { pos: new THREE.Vector3(-10.7, 2.8, 24.5), floor: 1.5 },
  'stairs_12': { pos: new THREE.Vector3(-9.5, 4.0, 23.5), floor: 1.5 },
  'f2_stairs': { pos: new THREE.Vector3(-8.2, 4.6, 1.0), floor: 2 },
  'f2_front_center': { pos: new THREE.Vector3(-6.5, 4.6, 1.0), floor: 2 },
  'f2_front_right': { pos: new THREE.Vector3(-6.5, 4.6, -4.5), floor: 2 },
  'f2_center_junction': { pos: new THREE.Vector3(-6.5, 4.6, -8), floor: 2 },
  'f2_mid_hallway': { pos: new THREE.Vector3(-6.5, 4.6, -12.7), floor: 2 },
  'f2_back': { pos: new THREE.Vector3(-6.5, 4.6, -15.8), floor: 2 },
  'f2_rightstairs': { pos: new THREE.Vector3(-6.5, 4.6, -20.0), floor: 2 },
  'f2_left1': { pos: new THREE.Vector3(-6.5, 4.6, 7), floor: 2 },
  'f2_left2': { pos: new THREE.Vector3(-6.5, 4.6, 14), floor: 2 },
  'f2_left3': { pos: new THREE.Vector3(-6.5, 4.6, 18), floor: 2 },
  'f2_left4': { pos: new THREE.Vector3(-6.5, 4.6, 21.5), floor: 2 },
  'f2_left5': { pos: new THREE.Vector3(-6.5, 4.6, 24.5), floor: 2 },
  'stairs_13': { pos: new THREE.Vector3(-9.1, 4.5, 25.5), floor: 1.5 },
  'stairs_14': { pos: new THREE.Vector3(-10.7, 4.6, 25.5), floor: 1.5 },
  'stairs_15': { pos: new THREE.Vector3(-10.7, 4.6, 24.5), floor: 1.5 },
  'stairs_16': { pos: new THREE.Vector3(-8.3, 6.2, 24), floor: 1.5 },
  'stairs_17': { pos: new THREE.Vector3(-9.0, 4.5, 3.5), floor: 1.5 },
  'stairs_18': { pos: new THREE.Vector3(-11.2, 4.6, 3.5), floor: 1.5 },
  'stairs_19': { pos: new THREE.Vector3(-10.5, 4.6, 1.6), floor: 1.5 },
  'stairs_20': { pos: new THREE.Vector3(-9.2, 5.8, 0.9), floor: 1.5 },
  'stairs_21': { pos: new THREE.Vector3(-9.2, 4.5, -22.0), floor: 1.5 },
  'stairs_22': { pos: new THREE.Vector3(-11.6, 4.6, -22.0), floor: 1.5 },
  'stairs_23': { pos: new THREE.Vector3(-11.1, 4.6, -20.0), floor: 1.5 },
  'stairs_24': { pos: new THREE.Vector3(-8.5, 6.5, -20.1), floor: 1.5 },
  'f3_stairs': { pos: new THREE.Vector3(-8.2, 6.30, 1.4), floor: 3 },
  'f3_front_center': { pos: new THREE.Vector3(-6.5, 6.30, 1.0), floor: 3 },
  'f3_front_right': { pos: new THREE.Vector3(-6.5, 6.30, -4.5), floor: 3 },
  'f3_center_junction': { pos: new THREE.Vector3(-6.5, 6.30, -8.2), floor: 3 },
  'f3_mid_hallway': { pos: new THREE.Vector3(-6.5, 6.30, -12.7), floor: 3 },
  'f3_back': { pos: new THREE.Vector3(-6.5, 6.30, -15.8), floor: 3 },
  'f3_rightstairs': { pos: new THREE.Vector3(-6.5, 6.30, -20.0), floor: 3 },
  'f3_left1': { pos: new THREE.Vector3(-6.5, 6.30, 7), floor: 3 },
  'f3_left2': { pos: new THREE.Vector3(-6.5, 6.30, 14), floor: 3 },
  'f3_left3': { pos: new THREE.Vector3(-6.5, 6.30, 18), floor: 3 },
  'f3_left4': { pos: new THREE.Vector3(-6.5, 6.30, 21.5), floor: 3 },
  'f3_left5': { pos: new THREE.Vector3(-6.5, 6.30, 24.5), floor: 3 },
  'stairs_25': { pos: new THREE.Vector3(-8.15, 6.30, 3.80), floor: 1.5 },
  'stairs_26': { pos: new THREE.Vector3(-11.2, 6.30, 3.40), floor: 1.5 },
  'stairs_27': { pos: new THREE.Vector3(-11.2, 6.30, 1.40), floor: 1.5 },
  'stairs_28': { pos: new THREE.Vector3(-9.2, 7.30, 1.40), floor: 1.5 },
  'f4_stairs': { pos: new THREE.Vector3(-7.2, 7.70, 1.4), floor: 4 },
  'f4_left1': { pos: new THREE.Vector3(-7.5, 7.70, 7), floor: 4 },
  'f4_left2': { pos: new THREE.Vector3(-7.5, 7.70, 14), floor: 4 },
  'f4_left3': { pos: new THREE.Vector3(-7.5, 7.70, 17.5), floor: 4 }
};

const navConnections = {
  'f1_front_left': ['f1_front_center'],
  'f1_front_center': ['f1_front_left', 'f1_stairs', 'f1_left1', 'f1_center_junction'],
  'f1_front_right': ['f1_junction_to_right', 'f1_mid_hallway'],
  'f1_junction_to_right': ['f1_center_junction', 'f1_front_right'],
  'f1_left1': ['f1_front_center', 'f1_left2'],
  'f1_left2': ['f1_left1', 'f1_left3'],
  'f1_left3': ['f1_left4', 'f1_left2'],
  'f1_left4': ['f1_left3', 'stairs_9'],
  'f1_center_junction': ['f1_junction_to_right', 'f1_front_center'],
  'f1_mid_hallway': ['f1_back', 'f1_front_right'],
  'f1_back': ['f1_mid_hallway', 'f1_rightstairs'],
  'f1_stairs': ['f1_front_center', 'stairs_1'],
  'f1_rightstairs': ['f1_back', 'stairs_5'],
  'stairs_1': ['f1_stairs', 'stairs_2'],
  'stairs_2': ['stairs_1', 'stairs_3'],
  'stairs_3': ['stairs_2', 'stairs_4'],
  'stairs_4': ['stairs_3', 'f2_stairs'],
  'stairs_5': ['f1_rightstairs', 'stairs_6'],
  'stairs_6': ['stairs_5', 'stairs_7'],
  'stairs_7': ['stairs_6', 'stairs_8'],
  'stairs_8': ['stairs_7', 'f2_rightstairs', 'stairs_21'],
  'stairs_9': ['f1_left4', 'stairs_10'],
  'stairs_10': ['stairs_9', 'stairs_11'],
  'stairs_11': ['stairs_10', 'stairs_12'],
  'stairs_12': ['stairs_11', 'f2_left5', 'stairs_13'],
  'f2_stairs': ['stairs_4', 'stairs_17', 'f2_front_center'],
  'f2_front_center': ['f2_stairs', 'f2_front_right', 'f2_left1'],
  'f2_front_right': ['f2_front_center', 'f2_center_junction'],
  'f2_center_junction': ['f2_front_right', 'f2_mid_hallway'],
  'f2_mid_hallway': ['f2_center_junction', 'f2_back'],
  'f2_back': ['f2_mid_hallway', 'f2_rightstairs'],
  'f2_rightstairs': ['f2_back', 'stairs_8', 'stairs_21'],
  'f2_left1': ['f2_left2', 'f2_front_center'],
  'f2_left2': ['f2_left1', 'f2_left3'],
  'f2_left3': ['f2_left4', 'f2_left2'],
  'f2_left4': ['f2_left3', 'f2_left5'],
  'f2_left5': ['f2_left4', 'stairs_12', 'stairs_13'],
  'stairs_13': ['f2_left5', 'stairs_12', 'stairs_14'],
  'stairs_14': ['stairs_15', 'stairs_13'],
  'stairs_15': ['stairs_14', 'stairs_16'],
  'stairs_16': ['stairs_15', 'f3_left5'],
  'stairs_17': ['f2_stairs', 'stairs_18'],
  'stairs_18': ['stairs_17', 'stairs_19'],
  'stairs_19': ['stairs_18', 'stairs_20'],
  'stairs_20': ['stairs_19', 'f3_stairs'],
  'stairs_21': ['f2_rightstairs', 'stairs_8', 'stairs_22'],
  'stairs_22': ['stairs_21', 'stairs_23'],
  'stairs_23': ['stairs_22', 'stairs_24'],
  'stairs_24': ['stairs_23', 'f3_rightstairs'],
  'f3_stairs': ['stairs_20', 'f3_front_center', 'stairs_25'],
  'f3_front_center': ['f3_stairs', 'f3_front_right', 'f3_left1'],
  'f3_front_right': ['f3_front_center', 'f3_center_junction'],
  'f3_center_junction': ['f3_front_right', 'f3_mid_hallway'],
  'f3_mid_hallway': ['f3_center_junction', 'f3_back'],
  'f3_back': ['f3_mid_hallway', 'f3_rightstairs'],
  'f3_rightstairs': ['f3_back', 'stairs_24'],
  'f3_left1': ['f3_left2', 'f3_front_center'],
  'f3_left2': ['f3_left1', 'f3_left3'],
  'f3_left3': ['f3_left4', 'f3_left2'],
  'f3_left4': ['f3_left3', 'f3_left5'],
  'f3_left5': ['f3_left4', 'stairs_16'],
  'stairs_25': ['f3_stairs', 'stairs_26'],
  'stairs_26': ['stairs_25', 'stairs_27'],
  'stairs_27': ['stairs_26', 'stairs_28'],
  'stairs_28': ['stairs_27', 'f4_stairs'],
  'f4_stairs': ['stairs_28', 'f4_left1'],
  'f4_left1': ['f4_stairs', 'f4_left2'],
  'f4_left2': ['f4_left1', 'f4_left3'],
  'f4_left3': ['f4_left2']
};

// ================= UTILITY FUNCTIONS =================

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.toggleNearestOverlay = function(e) {
  if (e) e.stopPropagation();
  const overlay = document.getElementById('nearestOverlay');
  const btn = document.getElementById('minimizeBtn');
  isOverlayMinimized = !isOverlayMinimized;
  if (isOverlayMinimized) {
    overlay.classList.add('minimized');
    btn.textContent = '+';
  } else {
    overlay.classList.remove('minimized');
    btn.textContent = '-';
  }
};

window.copyCameraPosition = function() {
  const pos = camera.position;
  const posText = `{ x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} }`;
  navigator.clipboard.writeText(posText).then(() => {
    alert('Camera position copied to clipboard!');
  }).catch(() => {
    alert('Position: ' + posText);
  });
};

window.toggleWaypoints = function() {
  showWaypointMarkers = !showWaypointMarkers;
  if (showWaypointMarkers) createWaypointMarkers();
  else clearWaypointMarkers();
};

window.resetCamera = function() {
  cameraZ = (CAM_Z_MIN + CAM_Z_MAX) / 2;
};

window.routeToDispenser = function(dispenserId) {
  const match = dispenserId.match(/DSP_(\d+)/i);
  if (!match) return;
  const localId = parseInt(match[1]);

  if (manualRoutedDispenserId === localId) {
    manualRoutedDispenserId = null;
    clearRoute();
    clearDispenserHighlight();
    findNearestDispenser();
    renderStatusCards();
    return;
  }

  const status = allDispenserStatuses[dispenserId];

  if (status === 0 || status === 1) {
    const info = dispenserInfo[dispenserId];
    const statusLabel = statusNames[status] || 'Unavailable';
    document.getElementById('nearestOverlay').style.display = 'block';
    document.getElementById('nearestInfo').textContent = `${info.location}`;
    document.getElementById('routeDetails').innerHTML =
      `<strong>Status:</strong> <span style="color:#ff4444;">${statusLabel}</span><br>` +
      `<strong style="color:#ff4444;">Cannot route — dispenser unavailable</strong>`;
    return;
  }

  manualRoutedDispenserId = localId;
  renderStatusCards();

  const info = dispenserInfo[dispenserId];
  document.getElementById('nearestOverlay').style.display = 'block';
  document.getElementById('nearestInfo').textContent = `${info.location}`;
  document.getElementById('routeDetails').innerHTML =
    `<strong>Status:</strong> ${statusNames[status]}<br>` +
    `<strong>User selected route</strong>`;

  setDispenserHighlight(localId, OUTLINE_COLOR_MANUAL);
  update3DRoute(SELECTED_DISPENSER_NUM, localId);  // CHANGED: from 1 to SELECTED_DISPENSER_NUM
};

function createWaypointMarkers() {
  clearWaypointMarkers();
  for (const [name, waypoint] of Object.entries(navWaypoints)) {
    const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
    let color;
    if (waypoint.floor === 1) color = 0xff0000;
    else if (waypoint.floor === 2) color = 0x0000ff;
    else if (waypoint.floor === 3) color = 0x00ff00;
    else if (waypoint.floor === 4) color = 0xff00ff;
    else color = 0xffff00;
    const sphereMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(waypoint.pos);
    sphere.userData.waypointName = name;
    sphere.userData.isWaypoint = true;
    scene.add(sphere);
    waypointMarkers.push(sphere);
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
  for (const [nodeName, connections] of Object.entries(navConnections)) {
    const startPos = navWaypoints[nodeName].pos;
    for (const connectedNode of connections) {
      const endPos = navWaypoints[connectedNode].pos;
      const geo = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
      const line = new THREE.Line(geo, lineMat);
      scene.add(line);
      waypointMarkers.push(line);
    }
  }
}

function clearWaypointMarkers() {
  waypointMarkers.forEach(marker => scene.remove(marker));
  waypointMarkers = [];
}

function updateCameraPositionDisplay() {
  const pos = camera.position;
  document.getElementById('camera-position').textContent =
    `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
  
  updateYouAreHereLabel();
}

function updateYouAreHereLabel() {
  if (!dispensers3D.length) return;
  // CHANGED: Find the current dispenser instead of DSP_1
  const currentDispenser = dispensers3D.find(d => d.userData.id === SELECTED_DISPENSER_NUM);
  if (!currentDispenser) return;
  
  const label = document.getElementById('youAreHereLabel');
  const container = document.getElementById('canvas-container');
  
  const pos3D = currentDispenser.position.clone();
  pos3D.y += 1.5;
  
  pos3D.project(camera);
  
  if (pos3D.z > 1) {
    label.style.display = 'none';
    return;
  }
  
  const x = (pos3D.x * 0.5 + 0.5) * container.clientWidth;
  const y = (-pos3D.y * 0.5 + 0.5) * container.clientHeight;
  
  if (x < 0 || x > container.clientWidth || y < 0 || y > container.clientHeight) {
    label.style.display = 'none';
    return;
  }
  
  label.style.display = 'block';
  label.style.left = x + 'px';
  label.style.top = y + 'px';
}

function updateOnlineOfflineCounts() {
  const now = Date.now();
  let online = 0;
  let offline = 0;
  Object.keys(lastHeartbeat).forEach(id => {
    const isOnline = now - lastHeartbeat[id] <= 70000;
    if (isOnline) online++;
    else offline++;
  });
  document.getElementById("onlineCount").textContent = online;
  document.getElementById("offlineCount").textContent = offline;
}

function renderStatusCards() {
  const container = document.getElementById("statusCards");
  container.innerHTML = "";
  
  const dispenserKeys = Object.keys(allDispenserStatuses).sort();
  
  const availableKeys = dispenserKeys.filter(id => {
    if (id === SELECTED_DISPENSER_ID) return false;
    const status = allDispenserStatuses[id];
    return status === 2 || status === 3 || status === 4;
  });
  
  if (availableKeys.length === 0) {
    container.innerHTML = '<div class="empty-state">No available dispensers found nearby</div>';
    return;
  }
  
  availableKeys.forEach(id => {
    const status = allDispenserStatuses[id];
    const info = dispenserInfo[id] || { name: id, location: 'Unknown' };
    const statusClass = statusClasses[status] || 'status-offline';
    const statusText = statusNames[status] || 'Unknown';
    
    const match = id.match(/DSP_(\d+)/i);
    const localId = match ? parseInt(match[1]) : null;
    const isSelected = manualRoutedDispenserId && localId === manualRoutedDispenserId;
    
    const cardHtml = `
      <div class="status-card ${isSelected ? 'selected-route' : ''}" id="card-${id}" onclick="routeToDispenser('${escapeHtml(id)}')">
        <div class="card-header">
          <span>${escapeHtml(info.location)}</span>
          ${isSelected ? '<span style="font-size:11px;color:#353ba7;">&#10003; Routing here</span>' : ''}
        </div>
        <div class="card-row">
          <span class="card-label">Status:</span>
          <span class="status-badge ${statusClass}" id="status-${id}">${escapeHtml(statusText)}</span>
        </div>
        <div class="click-hint">${isSelected ? '&#128309; Click to deselect' : '&#128070; Click to route here'}</div>
      </div>`;
    
    container.innerHTML += cardHtml;
  });
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
        monitorDispenserStatus();
        checkExistingComplaint();
      })
      .catch((error) => {
        console.error("Auth error:", error);
        document.getElementById("feedback").innerHTML =
          "<span class='error'>Authentication failed</span>";
      });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    document.getElementById("feedback").innerHTML =
      "<span class='error'>Failed to connect to server</span>";
  }
}

function monitorDispenserStatus() {
  function effectiveStatus(dispenserId) {
    const hb = lastHeartbeat[dispenserId];
    const isOnline = hb && (Date.now() - hb <= 70000);
    return isOnline ? (trueFirebaseStatus[dispenserId] ?? 0) : 0;
  }

  function syncDispenser(dispenserId) {
    const match = dispenserId.match(/DSP_(\d+)/i);
    if (!match) return;
    const localId  = parseInt(match[1]);
    const effStatus = effectiveStatus(dispenserId);

    const prev = allDispenserStatuses[dispenserId];
    allDispenserStatuses[dispenserId] = effStatus;
    if (dispenserId === SELECTED_DISPENSER_ID) currentDispenserStatus = effStatus;

    updateDispenser3DStatus(localId, effStatus);

    if (manualRoutedDispenserId && localId === manualRoutedDispenserId) {
      const wasAvail = prev === 2 || prev === 3 || prev === 4;
      const nowAvail = effStatus === 2 || effStatus === 3 || effStatus === 4;
      if (!nowAvail && wasAvail) {
        manualRoutedDispenserId = null;
        clearRoute();
        clearDispenserHighlight();
        renderStatusCards();
        findNearestDispenser();
      }
      return;
    }

    if (!manualRoutedDispenserId && localId === nearestDispenserId) {
      const wasAvail = prev === 2 || prev === 3 || prev === 4;
      const nowAvail = effStatus === 2 || effStatus === 3 || effStatus === 4;
      if (!nowAvail && wasAvail) {
        nearestDispenserId = null;
        clearRoute();
      }
    }
  }

  db.ref("dispenser").on("value", snap => {
    const data = snap.val() || {};
    Object.keys(data).forEach(dispenserId => {
      const statusStr = (data[dispenserId] || {}).status;
      const localStatus = firebaseStatusToLocal[statusStr] !== undefined
        ? firebaseStatusToLocal[statusStr]
        : 0;

      trueFirebaseStatus[dispenserId] = localStatus;

      syncDispenser(dispenserId);
    });
    renderStatusCards();
    if (!manualRoutedDispenserId) findNearestDispenser();
    updateOnlineOfflineCounts();
  });

  db.ref("heartbeat").on("value", snap => {
    const data = snap.val() || {};
    const now  = Date.now();

    Object.keys(data).forEach(dispenserId => {
      const d = data[dispenserId];
      if (d && d.epoch !== undefined) lastHeartbeat[dispenserId] = d.epoch;
    });

    let changed = false;
    Object.keys(trueFirebaseStatus).forEach(dispenserId => {
      const before = allDispenserStatuses[dispenserId] ?? -1;
      syncDispenser(dispenserId);
      if (allDispenserStatuses[dispenserId] !== before) changed = true;
    });

    if (changed) {
      renderStatusCards();
      if (!manualRoutedDispenserId) findNearestDispenser();
    }
    updateOnlineOfflineCounts();
  });

  setInterval(() => {
    let changed = false;
    Object.keys(trueFirebaseStatus).forEach(dispenserId => {
      const before = allDispenserStatuses[dispenserId] ?? -1;
      syncDispenser(dispenserId);
      if (allDispenserStatuses[dispenserId] !== before) changed = true;
    });
    if (changed) {
      renderStatusCards();
      if (!manualRoutedDispenserId) findNearestDispenser();
    }
    updateOnlineOfflineCounts();
  }, 1000);
}

function findNearestDispenser() {
  if (manualRoutedDispenserId) return;

  clearDispenserHighlight();

  if (currentDispenserStatus === 4) {
    document.getElementById('nearestOverlay').style.display = 'none';
    nearestDispenserId = null;
    clearRoute();
    return;
  }

  const available = Object.entries(allDispenserStatuses)
    .filter(([id, status]) =>
      id !== SELECTED_DISPENSER_ID &&
      (status === 2 || status === 3 || status === 4)
    );

  if (available.length === 0) {
    document.getElementById('nearestOverlay').style.display = 'none';
    nearestDispenserId = null;
    clearRoute();
    return;
  }

  let nearest = null;
  let minHops = Infinity;
  const startWP = dispenserToWaypoint[SELECTED_DISPENSER_NUM];  // CHANGED: from 1 to SELECTED_DISPENSER_NUM

  available.forEach(([id, status]) => {
    const match = id.match(/DSP_(\d+)/i);
    if (match) {
      const dispenserId = parseInt(match[1]);
      const endWP = dispenserToWaypoint[dispenserId];
      const waypointPath = findPath(startWP, endWP);
      if (waypointPath) {
        const hopCount = waypointPath.length - 1;
        if (hopCount < minHops) {
          minHops = hopCount;
          nearest = { id, status, dispenserId };
        }
      }
    }
  });

  if (nearest) {
    const info = dispenserInfo[nearest.id];
    nearestDispenserId = nearest.dispenserId;
    document.getElementById('nearestOverlay').style.display = 'block';
    document.getElementById('nearestInfo').textContent = `${info.location}`;
    document.getElementById('routeDetails').innerHTML =
      `<strong>Status:</strong> ${statusNames[nearest.status]}<br>` +
      `<strong>Waypoint Hops:</strong> ${minHops}`;
    setDispenserHighlight(nearest.dispenserId, OUTLINE_COLOR_AUTO);
    update3DRoute(SELECTED_DISPENSER_NUM, nearest.dispenserId);  // CHANGED: from 1 to SELECTED_DISPENSER_NUM
  } else {
    nearestDispenserId = null;
    clearRoute();
  }
}

function checkExistingComplaint() {
  db.ref("complaints").orderByChild("dispenser_id").equalTo(SELECTED_DISPENSER_ID).once("value", snap => {
    const complaints = snap.val();
    if (complaints) {
      const activeComplaints = Object.values(complaints).filter(c => !c.resolved);
      if (activeComplaints.length > 0) {
        hasActiveComplaint = true;
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('feedback').innerHTML =
          "<span class='warning'>You already have an active complaint for this dispenser.</span>";
      }
    }
  });
}

function formatDate(d) {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${weekday}, ${year}-${month}-${day} ${time}`;
}

window.submitComplaint = function () {
  if (!auth.currentUser) {
    document.getElementById("feedback").innerHTML =
      "<span class='error'>Please wait, signing in...</span>";
    return;
  }
  if (hasActiveComplaint) {
    document.getElementById("feedback").innerHTML =
      "<span class='warning'>You already have an active complaint.</span>";
    return;
  }
  const issue = document.getElementById("issue").value;
  const details = document.getElementById("details").value.trim();
  const complaint = {
    dispenser_id: SELECTED_DISPENSER_ID,
    issue: issue,
    details: details || null,
    timestamp: formatDate(new Date()),
    resolved: false,
    status: statusNames[currentDispenserStatus]
  };
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('feedback').innerHTML =
    "<span class='warning'>Submitting complaint...</span>";
  db.ref("complaints").push(complaint)
    .then(() => {
      hasActiveComplaint = true;
      document.getElementById("feedback").innerHTML =
        "<span class='success'>Complaint submitted successfully!</span>";
      document.getElementById("details").value = '';
    })
    .catch(err => {
      console.error(err);
      document.getElementById('submitBtn').disabled = false;
      document.getElementById("feedback").innerHTML =
        "<span class='error'>Error submitting complaint.</span>";
    });
};

// ================= THREE.JS PATHFINDING =================

function isStairSegment(node1, node2) {
  const isNode1Stair = node1.startsWith('stairs_');
  const isNode2Stair = node2.startsWith('stairs_');
  if (isNode1Stair || isNode2Stair) return true;
  const floor1 = navWaypoints[node1]?.floor;
  const floor2 = navWaypoints[node2]?.floor;
  if (floor1 !== floor2 && floor1 !== 1.5 && floor2 !== 1.5) return true;
  return false;
}

function findPath(startNode, endNode) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  for (const node in navWaypoints) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  }
  distances[startNode] = 0;
  while (unvisited.size > 0) {
    let current = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      if (distances[node] < minDist) {
        minDist = distances[node];
        current = node;
      }
    }
    if (current === endNode) break;
    if (current === null || distances[current] === Infinity) break;
    unvisited.delete(current);
    const neighbors = navConnections[current] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor)) continue;
      const edgeWeight = isStairSegment(current, neighbor) ? 2.5 : 1;
      const alt = distances[current] + edgeWeight;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }
  const path = [];
  let current = endNode;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }
  return path.length > 1 ? path : null;
}

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
    buildingModel = gltf.scene;
    buildingModel.traverse(function(node) {
      if (node.isMesh && node.visible) {
        const nodeName = node.name.toLowerCase();
        let mat;
        if (nodeName.includes('wall')) mat = new THREE.MeshStandardMaterial({ color: 0x0B3D2E, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.0 });
        else if (nodeName.includes('floor')) mat = new THREE.MeshStandardMaterial({ color: 0x0B3D2E, roughness: 0.5, metalness: 0.0 });
        else if (nodeName.includes('ceiling')) mat = new THREE.MeshStandardMaterial({ color: 0x0B3D2E, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.0 });
        else if (nodeName.includes('stair')) mat = new THREE.MeshStandardMaterial({ color: 0x0B3D2E, roughness: 0.4, metalness: 0.1 });
        else mat = new THREE.MeshStandardMaterial({ color: 0xDED7CC, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.0 });
        node.material = mat;
      }
    });
    const box = new THREE.Box3().setFromObject(buildingModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    buildingModel.position.x = -center.x;
    buildingModel.position.z = -center.z;
    buildingModel.position.y = -box.min.y;
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 50 / maxDim;
    buildingModel.scale.multiplyScalar(scale);
    scene.add(buildingModel);
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
    tilesModel = gltf.scene;
    tilesModel.traverse(function(node) {
      if (node.isMesh && node.visible) {
        node.material = new THREE.MeshStandardMaterial({ color: 0xD3D3D3, roughness: 0.25, metalness: 0.15, side: THREE.DoubleSide });
      }
    });
    if (buildingModel) { tilesModel.position.copy(buildingModel.position); tilesModel.scale.copy(buildingModel.scale); tilesModel.rotation.copy(buildingModel.rotation); }
    scene.add(tilesModel);
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
    lightModel = gltf.scene;
    if (buildingModel) { lightModel.position.copy(buildingModel.position); lightModel.scale.copy(buildingModel.scale); lightModel.rotation.copy(buildingModel.rotation); }
    scene.add(lightModel);
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
    doorModel = gltf.scene;
    doorModel.traverse(function(node) {
      if (node.isMesh && node.visible) {
        node.material = new THREE.MeshStandardMaterial({ color: 0xD3D3D3, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
      }
    });
    if (buildingModel) { doorModel.position.copy(buildingModel.position); doorModel.scale.copy(buildingModel.scale); doorModel.rotation.copy(buildingModel.rotation); }
    scene.add(doorModel);
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
    windowModel = gltf.scene;
    windowModel.traverse(function(node) {
      if (node.isMesh && node.visible) {
        node.material = new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.3 });
      }
    });
    if (buildingModel) { windowModel.position.copy(buildingModel.position); windowModel.scale.copy(buildingModel.scale); windowModel.rotation.copy(buildingModel.rotation); }
    scene.add(windowModel);
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
    columnModel = gltf.scene;
    if (buildingModel) { columnModel.position.copy(buildingModel.position); columnModel.scale.copy(buildingModel.scale); columnModel.rotation.copy(buildingModel.rotation); }
    scene.add(columnModel);
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
      
      // CHANGED: Only add ring to the current dispenser, not just DSP_1
      if (pos.id === SELECTED_DISPENSER_NUM) {
        const ringGeo = new THREE.RingGeometry(0.4, 0.65, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x353ba7, emissive: 0x353ba7, emissiveIntensity: 0.8, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -pos.y + 0.05;
        ring.userData.isYouAreHereRing = true;
        dispenser.add(ring);
      }
      
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
      const localId  = parseInt(match[1]);
      const hb       = lastHeartbeat[dispenserId];
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

function setDispenserHighlight(localId, color) {
  clearDispenserHighlight();
  if (!localId) return;

  const dispenser = dispensers3D.find(d => d.userData.id === localId);
  if (!dispenser) return;

  const box = new THREE.Box3().setFromObject(dispenser);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const padding = 0.05;
  size.x += padding;
  size.z += padding;

  size.y = Math.min(size.y, 1.5);
  size.y += padding;

  center.y = box.min.y + size.y / 1.3;

  const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);

  const fillMat = new THREE.MeshBasicMaterial({
    color: color,
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
  const edgeMat = new THREE.MeshBasicMaterial({ color: color });

  const edgesMesh = new THREE.Group();
  edgesMesh.position.copy(center);

  for (let i = 0; i < positions.count; i += 2) {
    const start = new THREE.Vector3().fromBufferAttribute(positions, i);
    const end   = new THREE.Vector3().fromBufferAttribute(positions, i + 1);

    const dir    = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const mid    = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const tubeGeo = new THREE.CylinderGeometry(edgeThickness, edgeThickness, length, 6, 1);
    const tube    = new THREE.Mesh(tubeGeo, edgeMat);

    tube.position.copy(mid);
    tube.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    edgesMesh.add(tube);
  }

  const group = new THREE.Group();
  group.userData.isOutline = true;
  group.add(fillMesh);
  group.add(edgesMesh);

  scene.add(group);
  highlightedDispenserOutline = group;
}

function clearDispenserHighlight() {
  if (highlightedDispenserOutline) {
    scene.remove(highlightedDispenserOutline);
    highlightedDispenserOutline = null;
  }
}

function update3DRoute(fromId, toId) {
  clearRoute();
  if (!fromId || !toId) return;
  const startWP = dispenserToWaypoint[fromId];
  const endWP = dispenserToWaypoint[toId];
  const waypointPath = findPath(startWP, endWP);
  if (!waypointPath) return;
  const startDispenser = dispensers3D.find(d => d.userData.id === fromId);
  const endDispenser = dispensers3D.find(d => d.userData.id === toId);
  if (!startDispenser || !endDispenser) return;
  const startPos = startDispenser.position.clone();
  const endPos = endDispenser.position.clone();
  const startOffset = dispenserOffsets[fromId] || new THREE.Vector3(0, 0, 0);
  const startBackPos = startPos.clone().add(startOffset);
  const endOffset = dispenserOffsets[toId] || new THREE.Vector3(0, 0, 0);
  const endBackPos = endPos.clone().add(endOffset);
  const waypointPositions = waypointPath.map(name => navWaypoints[name].pos.clone());
  const allPoints = [startPos, startBackPos, ...waypointPositions, endBackPos, endPos];
  const color = manualRoutedDispenserId ? 0x353ba7 : 0x00eeff;
  const lineMat = new THREE.LineBasicMaterial({ color: color, linewidth: 1 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints(allPoints);
  guidePath = new THREE.Line(lineGeo, lineMat);
  scene.add(guidePath);
  const arrowGeo = new THREE.ConeGeometry(0.15, 0.35, 8);
  const arrowMat = new THREE.MeshStandardMaterial({ color: color, emissive: color });
  const numArrows = 12;
  let totalDistance = 0;
  const segmentLengths = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const segLength = allPoints[i].distanceTo(allPoints[i + 1]);
    segmentLengths.push(segLength);
    totalDistance += segLength;
  }
  for (let i = 0; i < numArrows; i++) {
    const targetDist = (i / numArrows) * totalDistance;
    let currentDist = 0;
    let segmentIndex = 0;
    for (let j = 0; j < segmentLengths.length; j++) {
      if (currentDist + segmentLengths[j] >= targetDist) { segmentIndex = j; break; }
      currentDist += segmentLengths[j];
    }
    const segmentProgress = (targetDist - currentDist) / segmentLengths[segmentIndex];
    const startPoint = allPoints[segmentIndex];
    const endPoint = allPoints[segmentIndex + 1];
    const arrow = new THREE.Mesh(arrowGeo, arrowMat.clone());
    arrow.position.lerpVectors(startPoint, endPoint, segmentProgress);
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    arrow.userData.segmentIndex = segmentIndex;
    arrow.userData.segmentProgress = segmentProgress;
    arrow.userData.allPoints = allPoints;
    arrow.userData.segmentLengths = segmentLengths;
    arrow.userData.totalDistance = totalDistance;
    arrow.userData.basePosition = i / numArrows;
    scene.add(arrow);
    arrowIndicators.push(arrow);
  }
}

function clearRoute() {
  if (guidePath) { scene.remove(guidePath); guidePath = null; }
  arrowIndicators.forEach(arrow => scene.remove(arrow));
  arrowIndicators = [];
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
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (e.touches.length >= 1) controls3D.mouseX = e.touches[0].clientX;
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

let ringPulseTime = 0;
function animate3D() {
  requestAnimationFrame(animate3D);
  
  ringPulseTime += 0.04;
  // CHANGED: Find current dispenser instead of DSP_1
  const currentDispenser = dispensers3D.find(d => d.userData.id === SELECTED_DISPENSER_NUM);
  if (currentDispenser) {
    currentDispenser.traverse(node => {
      if (node.userData.isYouAreHereRing) {
        node.material.emissiveIntensity = 0.4 + 0.6 * Math.abs(Math.sin(ringPulseTime));
        const s = 1 + 0.15 * Math.abs(Math.sin(ringPulseTime));
        node.scale.set(s, s, s);
      }
    });
  }
  
  arrowIndicators.forEach(arrow => {
    arrow.userData.basePosition += 0.002;
    if (arrow.userData.basePosition > 1) arrow.userData.basePosition = 0;
    const targetDist = arrow.userData.basePosition * arrow.userData.totalDistance;
    let currentDist = 0;
    let segmentIndex = 0;
    for (let j = 0; j < arrow.userData.segmentLengths.length; j++) {
      if (currentDist + arrow.userData.segmentLengths[j] >= targetDist) { segmentIndex = j; break; }
      currentDist += arrow.userData.segmentLengths[j];
    }
    const segmentProgress = (targetDist - currentDist) / arrow.userData.segmentLengths[segmentIndex];
    const startPoint = arrow.userData.allPoints[segmentIndex];
    const endPoint = arrow.userData.allPoints[segmentIndex + 1];
    arrow.position.lerpVectors(startPoint, endPoint, segmentProgress);
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  });
  
  updateCamera();
  updateCameraPositionDisplay();
  renderer.render(scene, camera);
}

// Start the app
initializeFirebase();