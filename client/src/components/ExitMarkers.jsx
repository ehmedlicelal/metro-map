import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * Exit markers for the destination station.
 * Shows numbered pins for each exit.
 * The recommended exit pulses green and is larger.
 */

function createExitIcon(label, isRecommended) {
  const size = isRecommended ? 36 : 28;
  const color = isRecommended ? '#4ecca3' : '#e94560';
  const strokeWidth = isRecommended ? 2.5 : 2;
  const number = label.replace(/\D/g, '') || '?';

  const pulse = isRecommended
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6">
        <animate attributeName="r" values="${size / 2 - 4};${size / 2};${size / 2 - 4}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite"/>
      </circle>`
    : '';

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${pulse}
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}"/>
      <text x="${size / 2}" y="${size / 2 + 1}" text-anchor="middle" dominant-baseline="central"
        fill="#ffffff" font-size="${isRecommended ? 14 : 11}" font-weight="bold" font-family="Inter, sans-serif">
        ${number}
      </text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: `exit-marker ${isRecommended ? 'exit-recommended' : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

export default function ExitMarkers({ exits, recommendedExit, lang }) {
  if (!exits || exits.length === 0) return null;

  return (
    <>
      {exits.map((exit, i) => {
        const isRecommended =
          recommendedExit &&
          exit.lat === recommendedExit.lat &&
          exit.lng === recommendedExit.lng;

        return (
          <Marker
            key={`exit-${i}`}
            position={[exit.lat, exit.lng]}
            icon={createExitIcon(exit.label, isRecommended)}
            zIndexOffset={isRecommended ? 900 : 500}
          >
            <Popup className="exit-popup">
              <div className="exit-popup-content">
                <strong>🚪 {exit.label}</strong>
                <p>{exit.address}</p>
                {isRecommended && (
                  <span className="recommended-badge">
                    {lang === 'az' ? '✅ Tövsiyə olunan' : '✅ Recommended'}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
