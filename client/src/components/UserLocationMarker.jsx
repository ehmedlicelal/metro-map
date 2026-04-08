import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * Pulsing blue dot marker for user's live GPS location.
 * Includes a directional arrow that rotates based on heading.
 */
function createUserIcon(heading) {
  const rotation = heading || 0;

  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- Outer pulse ring -->
      <circle cx="20" cy="20" r="18" fill="rgba(66, 133, 244, 0.15)" stroke="none">
        <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
      </circle>
      <!-- Accuracy ring -->
      <circle cx="20" cy="20" r="12" fill="rgba(66, 133, 244, 0.25)" stroke="rgba(66, 133, 244, 0.5)" stroke-width="1"/>
      <!-- Center dot -->
      <circle cx="20" cy="20" r="7" fill="#4285F4" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <!-- Direction arrow -->
      <g transform="rotate(${rotation}, 20, 20)">
        <polygon points="20,4 16,14 24,14" fill="#4285F4" stroke="#fff" stroke-width="1" opacity="0.9"/>
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'user-location-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

export default function UserLocationMarker({ position, heading }) {
  if (!position) return null;

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={createUserIcon(heading)}
      zIndexOffset={1000}
    >
      <Popup className="user-popup">
        <span>📍 Your location</span>
        {position.accuracy && (
          <span className="accuracy"> ±{Math.round(position.accuracy)}m</span>
        )}
      </Popup>
    </Marker>
  );
}
