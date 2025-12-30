import {youIcon} from '../assets/you_icon.jpg';
import { topLeftLat, topLeftLng, bottomRightLat, bottomRightLng } from "./config.js";
import { activeMapDesktop, activeMapMobile } from '../index.js';

const mapBoundsGPS = {
  topLeft: { lat: topLeftLat, lng: topLeftLng },   // adjust to your actual map latitude
  bottomRight: { lat: bottomRightLat, lng: bottomRightLng }    // adjust to your actual map longitude
};

function latLngToPixel(lat, lng) {
  const { topLeft, bottomRight } = mapBoundsGPS;

  // Latitude → Y (top-left is 0)
  const y = ((lat - bottomRight.lat) / (topLeft.lat - bottomRight.lat)) * IMG_H;

  // Longitude → X (left is 0)
  const x = ((lng - topLeft.lng) / (bottomRight.lng - topLeft.lng)) * IMG_W;

  return [y, x];
};

export const tracking = function trackUser(){
    let youMarkerDesktop = null;
    let youMarkerMobile = null;

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