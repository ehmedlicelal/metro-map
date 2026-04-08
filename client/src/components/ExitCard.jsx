import React from 'react';

/**
 * Exit instruction card — prominent floating card at bottom of screen.
 * Shown during Phase 3 (Exiting the Station).
 */
export default function ExitCard({ route, phase, lang }) {
  if (!route || phase !== 3) return null;

  const { exit } = route;
  if (!exit?.recommendedExit) return null;

  const { recommendedExit, turnDirection, station } = exit;
  const exitNumber = recommendedExit.label?.replace(/\D/g, '') || '?';

  return (
    <div className="exit-card" id="exit-card">
      <div className="exit-card-header">
        <span className="exit-card-icon">🚪</span>
        <div className="exit-card-title">
          <span className="exit-card-az">
            {recommendedExit.label}-dən çıxmalısınız
          </span>
          <span className="exit-card-en">
            Exit from {recommendedExit.label}
          </span>
        </div>
        <div className="exit-number-badge">{exitNumber}</div>
      </div>

      {turnDirection && (
        <div className="exit-card-direction">
          <span className="direction-icon">🧭</span>
          <div className="direction-text">
            <span className="direction-az">
              Qatardan düşdükdən sonra <strong>{turnDirection.direction_az}</strong> dönün
            </span>
            <span className="direction-en">
              Turn <strong>{turnDirection.direction_en}</strong> after turnstiles
            </span>
          </div>
        </div>
      )}

      <div className="exit-card-address">
        <span className="address-icon">📍</span>
        <span className="address-text">{recommendedExit.address}</span>
      </div>

      {recommendedExit.distance && (
        <div className="exit-card-distance">
          <span className="distance-value">
            {Math.round(recommendedExit.distance)}m
          </span>
          <span className="distance-label">
            {lang === 'az' ? 'təyinata qədər' : 'to destination'}
          </span>
        </div>
      )}
    </div>
  );
}
