// index.js (Firestore dynamic POIs & Zones - desktop + mobile)

// ---------------- FIREBASE SETUP ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA093rrUBlUG4tDnGUdyql0-c7m-E2DDHw",
  authDomain: "sulam-project-map.firebaseapp.com",
  projectId: "sulam-project-map",
  storageBucket: "sulam-project-map.firebasestorage.app",
  messagingSenderId: "402597128748",
  appId: "1:402597128748:web:f73f4b44e44fcb55bfff89",
  measurementId: "G-SDHPJ5G431"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- UI REFERENCES ----------------
const markerListEl = document.getElementById('markerList');
const zoneListEl = document.getElementById('zoneList');
const poiModal = document.getElementById('poiModal');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalDesc = document.getElementById('modalDesc');
const closeModalBtn = document.getElementById('closeModal');
const modalShareBtn = document.getElementById('modalShare');
const selectedInfoEl = document.getElementById('selectedInfo');
const poiSearchEl = document.getElementById('poiSearch');

// ---------------- MAP CONFIG ----------------
const IMAGE_FILENAME = "bwm_map3.jpg";
const IMG_W = 1530;
const IMG_H = 1050;
const bounds = [[0, 0], [IMG_H, IMG_W]];

let activeMapDesktop = null;
let activeMapMobile = null;
let markerClusterGroupDesktop = null;
let markerClusterGroupMobile = null;
let poiMarkers = []; // { id, desktop, mobile }
let zonePolygons = []; // { id, desktop, mobile }

// ---------------- USER TRACKING ----------------
const youIcon = L.icon({
  iconUrl: 'you_icon.jpg',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

let youMarkerDesktop = null;
let youMarkerMobile = null;

const mapBoundsGPS = {
  topLeft: { lat: 3.0000, lng: 101.5000 },   // adjust to your actual map latitude
  bottomRight: { lat: 2.9600, lng: 101.5400 }    // adjust to your actual map longitude
};

function latLngToPixel(lat, lng) {
  const { topLeft, bottomRight } = mapBoundsGPS;

  // Latitude → Y (top-left is 0)
  const y = ((lat - bottomRight.lat) / (topLeft.lat - bottomRight.lat)) * IMG_H;

  // Longitude → X (left is 0)
  const x = ((lng - topLeft.lng) / (bottomRight.lng - topLeft.lng)) * IMG_W;

  return [y, x];
}

// ---------------- MODAL FUNCTIONS ----------------
function showModal(data) {
  modalTitle.textContent = data.title || '';
  modalImage.src = data.img || '';
  modalImage.alt = data.title || 'POI image';
  modalDesc.textContent = data.desc || '';
  poiModal.setAttribute('aria-hidden', 'false');
  poiModal._current = data;
  selectedInfoEl.textContent = data.title || '';
}

function hideModal() {
  poiModal.setAttribute('aria-hidden', 'true');
  modalImage.src = '';
  poiModal._current = null;
  selectedInfoEl.textContent = 'Select a POI or Zone to see details';
}

closeModalBtn.addEventListener('click', hideModal);
poiModal.addEventListener('click', (e) => { if (e.target === poiModal) hideModal(); });

modalShareBtn.addEventListener('click', () => {
  if (!poiModal._current) return;
  const id = poiModal._current.id || poiModal._current.title;
  const hash = `#poi=${encodeURIComponent(id)}`;
  const url = location.origin + location.pathname + hash;
  navigator.clipboard.writeText(url).then(() => {
    modalShareBtn.textContent = 'Link copied';
    setTimeout(() => modalShareBtn.textContent = 'Copy link', 1400);
  });
});

// ---------------- MAP INIT ----------------
function initMaps() {
  // Desktop
  activeMapDesktop = L.map('map-desktop', { crs: L.CRS.Simple, minZoom: -1, maxZoom: 3, zoomControl: true, attributionControl: false, maxBounds: bounds, maxBoundsViscosity: 0.8 });
  L.imageOverlay(IMAGE_FILENAME, bounds).addTo(activeMapDesktop);
  activeMapDesktop.fitBounds(bounds);
  markerClusterGroupDesktop = L.markerClusterGroup();
  activeMapDesktop.addLayer(markerClusterGroupDesktop);

  // Mobile
  activeMapMobile = L.map('map-mobile', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 3,
    zoomControl: true,
    attributionControl: false,
    maxBounds: bounds,        // <-- restrict map to image bounds
    maxBoundsViscosity: 0.8   // <-- smooth bounce-back effect
  });
  L.imageOverlay(IMAGE_FILENAME, bounds).addTo(activeMapMobile);
  activeMapMobile.fitBounds(bounds);
  markerClusterGroupMobile = L.markerClusterGroup();
  activeMapMobile.addLayer(markerClusterGroupMobile);
}

// ---------------- FIRESTORE LISTENERS ----------------
const poisCol = collection(db, 'pois');
const zonesCol = collection(db, 'zones');

function startListeners() {
  // POIs
  onSnapshot(poisCol, snapshot => {
    // Remove old markers directly from maps
    poiMarkers.forEach(m => {
      activeMapDesktop.removeLayer(m.desktop);
      activeMapMobile.removeLayer(m.mobile);
    });
    poiMarkers = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      const lat = Number(d.coords?.x);
      const lng = Number(d.coords?.y);
      if (isNaN(lat) || isNaN(lng)) return;

      const markerDesktop = L.marker([lat, lng])
        .on('click', () => showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img }));

      const markerMobile = L.marker([lat, lng])
        .on('click', () => showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img }));

      // Add markers straight to maps (NO CLUSTERING)
      markerDesktop.addTo(activeMapDesktop);
      markerMobile.addTo(activeMapMobile);

      poiMarkers.push({
        id: doc.id,
        desktop: markerDesktop,
        mobile: markerMobile,
        data: d
      });
    });

    populatePOIsSidebar(snapshot.docs);
  });


  // Zones
  onSnapshot(zonesCol, snapshot => {
    // remove old polygons
    zonePolygons.forEach(z => {
      activeMapDesktop.removeLayer(z.desktop);
      activeMapMobile.removeLayer(z.mobile);
    });
    zonePolygons = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      const coords = d.coordinates.map(c => [c.x, c.y]); // Leaflet uses [lat, lng] = [y, x]
      const polyDesktop = L.polygon(coords, { color: '#1e6091', fillOpacity: 0.28, weight: 2 }).on('click', () => showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img }));
      const polyMobile = L.polygon(coords, { color: '#1e6091', fillOpacity: 0.28, weight: 2 }).on('click', () => showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img }));

      polyDesktop.addTo(activeMapDesktop);
      polyMobile.addTo(activeMapMobile);

      zonePolygons.push({ id: doc.id, desktop: polyDesktop, mobile: polyMobile, data: d });
    });

    populateZonesSidebar(snapshot.docs);
  });
}

// ---------------- SIDEBAR ----------------
function populatePOIsSidebar(docs) {
  markerListEl.innerHTML = '';
  docs.forEach(doc => {
    const d = doc.data();
    const li = document.createElement('li');
    li.dataset.id = doc.id;
    li.innerHTML = `
      <img class="thumb" src="${d.thumb || d.img || ''}" alt="${d.title || 'POI'} thumbnail">
      <div class="item-text">
        <div class="title">${d.title}</div>
        <div class="meta">POI</div>
      </div>
      <div class="list-actions">
        <button class="btn small" data-action="goto">Go</button>
        <button class="btn small secondary" data-action="share">Share</button>
      </div>
    `;
    markerListEl.appendChild(li);

    li.querySelector('[data-action="goto"]').addEventListener('click', () => {
      const markerObj = poiMarkers.find(m => m.id === doc.id);
      if (markerObj) {
        activeMapDesktop.setView(markerObj.desktop.getLatLng(), Math.max(activeMapDesktop.getZoom(), activeMapDesktop.getMinZoom()));
        activeMapMobile.setView(markerObj.mobile.getLatLng(), Math.max(activeMapMobile.getZoom(), activeMapMobile.getMinZoom()));
        showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img });
      }
    });

    li.querySelector('[data-action="share"]').addEventListener('click', () => {
      const hash = `#poi=${encodeURIComponent(doc.id)}`;
      navigator.clipboard.writeText(location.origin + location.pathname + hash);
    });

    li.addEventListener('click', () => {
      const markerObj = poiMarkers.find(m => m.id === doc.id);
      if (markerObj) {
        activeMapDesktop.setView(markerObj.desktop.getLatLng(), Math.max(activeMapDesktop.getZoom(), activeMapDesktop.getMinZoom()));
        activeMapMobile.setView(markerObj.mobile.getLatLng(), Math.max(activeMapMobile.getZoom(), activeMapMobile.getMinZoom()));
        showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img });
      }
    });
  });
}

function populateZonesSidebar(docs) {
  zoneListEl.innerHTML = '';
  docs.forEach(doc => {
    const d = doc.data();
    const li = document.createElement('li');
    li.dataset.id = doc.id;
    li.innerHTML = `
      <img class="thumb" src="${d.thumb || d.img || ''}" alt="${d.title || 'Zone'} thumbnail">
      <div class="item-text">
        <div class="title">${d.title}</div>
        <div class="meta">Zone</div>
      </div>
      <div class="list-actions">
        <button class="btn small" data-action="goto">Go</button>
        <button class="btn small secondary" data-action="share">Share</button>
      </div>
    `;
    zoneListEl.appendChild(li);

    li.querySelector('[data-action="goto"]').addEventListener('click', () => {
      const polyObj = zonePolygons.find(z => z.id === doc.id);
      if (polyObj) {
        activeMapDesktop.fitBounds(polyObj.desktop.getBounds());
        activeMapMobile.fitBounds(polyObj.mobile.getBounds());
        showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img });
      }
    });

    li.querySelector('[data-action="share"]').addEventListener('click', () => {
      const hash = `#poi=${encodeURIComponent(doc.id)}`;
      navigator.clipboard.writeText(location.origin + location.pathname + hash);
    });

    li.addEventListener('click', () => {
      const polyObj = zonePolygons.find(z => z.id === doc.id);
      if (polyObj) {
        activeMapDesktop.fitBounds(polyObj.desktop.getBounds());
        activeMapMobile.fitBounds(polyObj.mobile.getBounds());
        showModal({ id: doc.id, title: d.title, desc: d.desc, img: d.img });
      }
    });
  });
}

// ---------------- SEARCH ----------------
poiSearchEl.addEventListener('input', () => {
  const q = poiSearchEl.value.trim().toLowerCase();

  Array.from(markerListEl.children).forEach(li => {
    const title = li.querySelector('.title').textContent.toLowerCase();
    li.style.display = title.includes(q) ? '' : 'none';
  });
  Array.from(zoneListEl.children).forEach(li => {
    const title = li.querySelector('.title').textContent.toLowerCase();
    li.style.display = title.includes(q) ? '' : 'none';
  });
});

// ---------------- GPS TRACKING ----------------
function trackUser() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.watchPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const coords = latLngToPixel(lat, lng); // convert GPS → map pixel

    // Desktop
    if (youMarkerDesktop) {
      youMarkerDesktop.setLatLng(coords);
    } else {
      youMarkerDesktop = L.marker(coords, { icon: youIcon }).addTo(activeMapDesktop);
    }

    // Mobile
    if (youMarkerMobile) {
      youMarkerMobile.setLatLng(coords);
    } else {
      youMarkerMobile = L.marker(coords, { icon: youIcon }).addTo(activeMapMobile);
    }

  }, (err) => {
    console.error("GPS error:", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 1000
  });
}

// ---------------- INIT ----------------
window.addEventListener('DOMContentLoaded', () => {
  initMaps();
  startListeners();

  trackUser(); // <-- start real-time GPS tracking

  const fitAllBtnTop = document.getElementById('fitAllBtnTop');
  fitAllBtnTop.addEventListener('click', () => {
    activeMapDesktop.fitBounds([[0, 0], [IMG_H, IMG_W]]);
    activeMapMobile.fitBounds([[0, 0], [IMG_H, IMG_W]]);
  });
});

const sidebarEl = document.getElementById('sidebar');

const adminBtn = document.getElementById('adminBtn');
adminBtn.addEventListener('click', () => {
  window.location.href = 'login.html';
});

// Sidebar toggle helpers (mobile uses .open, desktop uses .hidden)
function isMobileWidth() {
  return window.matchMedia('(max-width:900px)').matches;
}

function openSidebarForMobile() {
  sidebarEl.classList.add('open');
  sidebarEl.classList.remove('hidden');
  setTimeout(() => { activeMapDesktop && activeMapDesktop.invalidateSize(); activeMapMobile && activeMapMobile.invalidateSize(); }, 260);
}
function closeSidebarForMobile() {
  sidebarEl.classList.remove('open');
  // keep hidden class handled by CSS for desktop
  setTimeout(() => { activeMapDesktop && activeMapDesktop.invalidateSize(); activeMapMobile && activeMapMobile.invalidateSize(); }, 260);
}
function toggleSidebar() {
  if (isMobileWidth()) {
    // mobile: toggle open/closed
    if (sidebarEl.classList.contains('open')) closeSidebarForMobile(); else openSidebarForMobile();
  } else {
    // desktop: toggle hidden/visible
    sidebarEl.classList.toggle('hidden');
    // ensure .open isn't stuck
    sidebarEl.classList.remove('open');
    setTimeout(() => { activeMapDesktop && activeMapDesktop.invalidateSize(); activeMapMobile && activeMapMobile.invalidateSize(); }, 260);
  }
}

// Hook existing elements (safe no-op if element missing)
const toggleDesktopBtn = document.getElementById('toggleSidebarBtn');
const openListBtnEl = document.getElementById('openListBtn');
const closeSidebarBtnEl = document.getElementById('closeSidebarBtn');

// wire desktop toggle button
if (toggleDesktopBtn) toggleDesktopBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });

// wire the floating mobile button (already existed) — reuse same toggle
if (openListBtnEl) openListBtnEl.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });

// make the X (close) button close in both modes
if (closeSidebarBtnEl) closeSidebarBtnEl.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isMobileWidth()) closeSidebarForMobile();
  else sidebarEl.classList.add('hidden');
});

// Close sidebar when clicking outside (only collapse mobile; desktop remains)
document.addEventListener('click', (e) => {
  if (!sidebarEl.contains(e.target) && !openListBtnEl?.contains(e.target) && !toggleDesktopBtn?.contains(e.target)) {
    if (isMobileWidth()) closeSidebarForMobile();
  }
});

// Keep layout consistent when resizing: if resize from mobile->desktop, ensure classes set correctly
window.addEventListener('resize', () => {
  if (!isMobileWidth()) {
    // ensure mobile open state is removed when switching to desktop
    sidebarEl.classList.remove('open');
  }
});

