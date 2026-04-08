import React from 'react';

/**
 * Language toggle button — switches between Azerbaijani and English.
 */
export default function LanguageToggle({ lang, onToggle }) {
  return (
    <button
      className="language-toggle"
      id="language-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${lang === 'az' ? 'English' : 'Azerbaijani'}`}
    >
      <span className={`lang-option ${lang === 'az' ? 'active' : ''}`}>AZ</span>
      <span className="lang-divider">/</span>
      <span className={`lang-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
    </button>
  );
}
