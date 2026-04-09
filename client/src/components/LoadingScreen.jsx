import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ onComplete, persistent = false, onCancel = null, message = null }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (persistent) return; // Wait for manual trigger

    // Show the loading screen for 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for fade-out transition
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete, persistent]);

  return (
    <div className={`loading-screen ${!isVisible ? 'fade-out' : ''}`}>
      <div className="train-container">
        <svg className="metro-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="track-clip">
              {/* Trapezoid giving ties a precise border parallel to the slanted rails */}
              <polygon points="35,62 65,62 90,130 10,130" />
            </clipPath>
          </defs>

          {/* Moving Tracks (in background) */}
          <g className="tracks-group">
            {/* The Slanted Rails */}
            <path className="track-rail" d="M 40 62 L 15 130 M 60 62 L 85 130" stroke="white" strokeWidth="4" strokeLinecap="round" />
            
            {/* The Ties (clipped perfectly to the perspective) */}
            <g clipPath="url(#track-clip)">
              <path className="track-tie tie-1" d="M 0 62 L 100 62" stroke="white" strokeWidth="3" />
              <path className="track-tie tie-2" d="M 0 62 L 100 62" stroke="white" strokeWidth="3" />
              <path className="track-tie tie-3" d="M 0 62 L 100 62" stroke="white" strokeWidth="3" />
              <path className="track-tie tie-4" d="M 0 62 L 100 62" stroke="white" strokeWidth="3" />
              <path className="track-tie tie-5" d="M 0 62 L 100 62" stroke="white" strokeWidth="3" />
            </g>
          </g>

          {/* Shaking Train Body */}
          <g className="train-body">
            <rect x="25" y="20" width="50" height="42" rx="12" fill="white" />
            {/* Windows */}
            <rect x="30" y="27" width="18" height="14" fill="#d9242d" />
            <rect x="52" y="27" width="18" height="14" fill="#d9242d" />
            {/* Headlights */}
            <circle cx="35" cy="52" r="4.5" fill="#d9242d" />
            <circle cx="65" cy="52" r="4.5" fill="#d9242d" />
          </g>
        </svg>

        {message && (
          <div className="loading-message" style={{ color: 'white', marginTop: '20px', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        {onCancel && (
          <button 
            className="loading-cancel-btn" 
            onClick={onCancel}
            style={{
              marginTop: '30px',
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              backdropFilter: 'blur(5px)'
            }}
          >
            Cancel & Enter Manually
          </button>
        )}
      </div>
    </div>
  );
}
