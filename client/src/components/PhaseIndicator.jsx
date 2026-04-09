import React from 'react';
import { t } from '../i18n/translations.jsx';

/**
 * Phase indicator badges — shows current journey phase.
 * Uses full translation system supporting 10+ languages.
 */
export default function PhaseIndicator({ phase, lang, isWalkOnly }) {
  if (phase === 0) return null;
  const tr = t(lang);

  let phases = tr.phases;

  if (isWalkOnly) {
    phases = [tr.walkOnlyPhase];
  }

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
