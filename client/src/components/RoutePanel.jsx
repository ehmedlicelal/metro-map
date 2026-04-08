import React, { useState } from 'react';

/**
 * Slide-up bottom drawer panel showing metro journey information.
 * Visible during Phase 2 (On the Metro).
 */
export default function RoutePanel({ route, phase, currentStopIndex, lang }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);

  if (!route || phase !== 2) return null;

  const { metro, entry, exit } = route;
  const stations = metro?.stationDetails || [];
  const lineSegments = metro?.lineSegments || [];
  const transfers = metro?.transfers || [];
  const totalStops = stations.length - 1;
  const stopsRemaining = totalStops - (currentStopIndex || 0);

  // Current line info
  let currentLine = lineSegments[0];
  if (lineSegments.length > 1 && currentStopIndex) {
    let stopCount = 0;
    for (const seg of lineSegments) {
      stopCount += seg.stations.length - 1;
      if (currentStopIndex < stopCount) {
        currentLine = seg;
        break;
      }
    }
  }

  // Direction: last station on the current line
  const directionStation = currentLine
    ? stations.find(s => s.id === currentLine.stations[currentLine.stations.length - 1])
    : null;

  // Next stop
  const nextIndex = (currentStopIndex || 0) + 1;
  const nextStation = nextIndex < stations.length ? stations[nextIndex] : null;

  // Calculate remaining time
  const transfersRemaining = transfers.filter(t => {
    const tIndex = stations.findIndex(s => s.id === t.station);
    return tIndex > (currentStopIndex || 0);
  }).length;
  
  const timeRemainingSeconds = Math.max(0, stopsRemaining * 120) + (transfersRemaining * 300);
  const arrivalTime = new Date(Date.now() + timeRemainingSeconds * 1000);
  const timeString = arrivalTime.toLocaleTimeString(lang === 'az' ? 'az-AZ' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const distance = touchEndY - touchStartY;
    
    // Swipe threshold
    if (distance > 40) {
      setIsCollapsed(true);
    } else if (distance < -40) {
      setIsCollapsed(false);
    }
    setTouchStartY(null);
  };

  return (
    <div 
      className={`route-panel ${phase === 2 ? 'visible' : ''} ${isCollapsed ? 'collapsed' : ''}`} 
      id="route-panel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Clickable Handle to toggle visibility */}
      <button 
        className="panel-handle-btn" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expand route details" : "Collapse route details"}
      >
        <div className="panel-handle" />
      </button>

      {/* Content wrapper controls visibility when collapsed to ensure smooth transitions */}
      <div className="panel-content">
        {/* Current Line */}
        <div className="panel-header">
          <div
            className={`line-indicator ${currentLine?.line ? `line-${currentLine.line}` : 'line-green'}`}
          />
          <div className="panel-title">
            <span className="on-line">
              {lang === 'az' ? 'Xəttdə' : 'On'}{' '}
              {lang === 'az' ? currentLine?.lineName_az : currentLine?.lineName_en}
            </span>
            {directionStation && (
              <span className="direction">
                → {lang === 'az' ? directionStation.station_az : directionStation.station_en}
              </span>
            )}
          </div>
        </div>

        {/* Next Stop */}
        {nextStation && (
          <div className="panel-next-stop">
            <span className="next-label">{lang === 'az' ? 'Növbəti' : 'Next'}</span>
            <span className="next-station">
              {lang === 'az' ? nextStation.station_az : nextStation.station_en}
            </span>
          </div>
        )}

        {/* Exit Station */}
        <div className="panel-exit-stop">
          <span className="exit-label">{lang === 'az' ? 'Düşün' : 'Exit at'}</span>
          <span className="exit-station">
            🔴 {lang === 'az' ? exit?.station?.station_az : exit?.station?.station_en}
          </span>
        </div>

        {/* Door side hint */}
        {directionStation && (
          <div className="door-side-hint">
            <span className="door-icon">🚪</span>
            <span className="door-text">
              {lang === 'az' 
                ? `Düşmək üçün ${(directionStation.id === 'darnagul' || directionStation.id === 'hazi-aslanov') ? 'sağa' : 'sola'} dönün` 
                : `Turn ${(directionStation.id === 'darnagul' || directionStation.id === 'hazi-aslanov') ? 'right' : 'left'} to get off`}
            </span>
          </div>
        )}

        {/* Stops Counter & ETA */}
        <div className="panel-metrics">
          <div className="counter-badge">
            <span className="counter-number">{Math.max(0, stopsRemaining)}</span>
            <span className="counter-label">
              {lang === 'az' ? 'dayanacaq qaldı' : 'stops remaining'}
            </span>
          </div>
          <div className="eta-badge">
            <span className="eta-icon">⏱️</span>
            <span className="eta-time">{timeString}</span>
            <span className="eta-label">
              {lang === 'az' ? 'çatma vaxtı' : 'arrival'}
            </span>
          </div>
        </div>

        {/* Transfer Warning */}
        {transfers.length > 0 && (
          <div className="panel-transfers">
            {transfers.map((t, i) => {
              const transferStation = stations.find(s => s.id === t.station);
              return (
                <div key={i} className="transfer-info">
                  <span className="transfer-icon">🔄</span>
                  <span>
                    {lang === 'az' ? 'Keçid' : 'Transfer'}: {' '}
                    {lang === 'az' ? transferStation?.station_az : transferStation?.station_en}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Station Progress Dots */}
        <div className="station-progress">
          {stations.map((s, i) => {
            const isVisited = i <= (currentStopIndex || 0);
            const isCurrent = i === (currentStopIndex || 0);
            const isTransfer = transfers.some(t => t.station === s.id);

            return (
              <div key={s.id} className="progress-stop">
                <div
                  className={`progress-dot ${isVisited ? 'visited' : ''} ${isCurrent ? 'current' : ''} ${isTransfer ? 'transfer' : ''}`}
                />
                {(isCurrent || i === 0 || i === stations.length - 1 || isTransfer) && (
                  <span className="progress-label">
                    {lang === 'az' ? s.station_az : s.station_en}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
