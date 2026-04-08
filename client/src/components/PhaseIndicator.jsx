import React from 'react';

/**
 * Phase indicator badges — shows current journey phase.
 * Phases: Walk → Metro → Exit → Walk
 */
const PHASES = {
  az: [
    { id: 1, icon: '🚶', label: 'Piyada', desc: 'Stansiyaya doğru' },
    { id: 2, icon: '🚇', label: 'Metroda', desc: 'Qatarda' },
    { id: 3, icon: '🚪', label: 'Çıxış', desc: 'Stansiyadan çıxış' },
    { id: 4, icon: '🏁', label: 'Piyada', desc: 'Təyinata doğru' }
  ],
  en: [
    { id: 1, icon: '🚶', label: 'Walk', desc: 'To station' },
    { id: 2, icon: '🚇', label: 'Metro', desc: 'On train' },
    { id: 3, icon: '🚪', label: 'Exit', desc: 'Leave station' },
    { id: 4, icon: '🏁', label: 'Walk', desc: 'To destination' }
  ]
};

export default function PhaseIndicator({ phase, lang }) {
  if (phase === 0) return null;

  const phases = PHASES[lang] || PHASES.en;

  return (
    <div className="phase-indicator" id="phase-indicator">
      {phases.map((p, i) => (
        <React.Fragment key={p.id}>
          <div className={`phase-badge ${phase === p.id ? 'active' : ''} ${phase > p.id ? 'completed' : ''}`}>
            <span className="phase-icon">{p.icon}</span>
            <span className="phase-label">{p.label}</span>
          </div>
          {i < phases.length - 1 && (
            <div className={`phase-connector ${phase > p.id ? 'completed' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
