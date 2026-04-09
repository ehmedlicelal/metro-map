import React, { useState } from 'react';
import { t } from '../i18n/translations';

/**
 * Exit instruction card — prominent floating card at bottom of screen.
 * Shown during Phase 3 (Exiting the Station).
 * Supports 30+ languages via translations system.
 */
export default function ExitCard({ route, phase, lang }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);

  if (!route || phase !== 3) return null;

  const { exit } = route;
  if (!exit?.recommendedExit) return null;

  const tr = t(lang);
  const { recommendedExit, turnDirection, station } = exit;
  const exitNumber = recommendedExit.label?.replace(/\D/g, '') || '?';

  const handleTouchStart = (e) => { setTouchStartY(e.touches[0].clientY); };
  const handleTouchEnd = (e) => {
    if (touchStartY === null) return;
    const distance = e.changedTouches[0].clientY - touchStartY;
    if (distance > 40) setIsCollapsed(true);
    else if (distance < -40) setIsCollapsed(false);
    setTouchStartY(null);
  };

  return (
    <div
      className={`exit-card ${isCollapsed ? 'collapsed' : ''}`}
      id="exit-card"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="panel-handle-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand exit details' : 'Collapse exit details'}
      >
        <div className="panel-handle" />
      </button>

      <div className="panel-content">
        <div className="exit-card-header">
          <span className="exit-card-icon">🚪</span>
          <div className="exit-card-title">
            <span className="exit-card-az">
              {tr.exitFrom(recommendedExit.label)}
            </span>
          </div>
        </div>

        {turnDirection && (
          <div className="exit-card-directions">
            {/* Step 1: Platform — which way to walk from the train car to the exit door */}
            {turnDirection.platform_en && (
              <div className="exit-card-direction exit-direction-platform">
                <span className="direction-step">1</span>
                <span className="direction-icon">🚃</span>
                <div className="direction-text">
                  <span className="direction-en">
                    {tr.turnAfterTrain(turnDirection.platform_en)}
                  </span>
                </div>
              </div>
            )}
            {/* Step 2: Street — which way to turn after the turnstile / exit door */}
            <div className="exit-card-direction exit-direction-street">
              <span className="direction-step">2</span>
              <span className="direction-icon">🧭</span>
              <div className="direction-text">
                <span className="direction-en">
                  {tr.turnAfter(turnDirection.direction_en)}
                </span>
              </div>
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
            <span className="distance-label">{tr.toDestination}</span>
          </div>
        )}
      </div>
    </div>
  );
}
