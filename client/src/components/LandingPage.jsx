import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../services/api';
import { LANGUAGES, PINNED_LANGS, t } from '../i18n/translations';
import { useGeolocation } from '../hooks/useGeolocation';
import './LandingPage.css';

const MORE_LANGS = LANGUAGES.filter(l => !PINNED_LANGS.includes(l.code));
const PINNED = LANGUAGES.filter(l => PINNED_LANGS.includes(l.code));

export default function LandingPage({ onSelectDestination }) {
  const [lang, setLang] = useState('en');
  const { location: gpsLocation } = useGeolocation();

  // Destination states
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Origin states removed (we now rely on GPS or manual selection in Map view)
  const [selectedOrigin, setSelectedOrigin] = useState(null);

  const [mounted, setMounted] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const debounceRef = useRef(null);
  const skipSearchRef = useRef(false);

  const moreRef = useRef(null);
  const tr = t(lang);

  const needsOrigin = !gpsLocation;

  useEffect(() => { const id = setTimeout(() => setMounted(true), 60); return () => clearTimeout(id); }, []);

  // Debounced Destination search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipSearchRef.current) { skipSearchRef.current = false; return; }
    if (query.trim().length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query);
        setResults(places);
        setIsOpen(places.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);


  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest('.lp-search-wrap')) {
        setIsOpen(false);
      }
      if (!e.target.closest('.lp-lang-cluster')) { setShowMore(false); }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);


  const handleSelectDest = (place) => {
    const dest = { lat: parseFloat(place.lat), lng: parseFloat(place.lon), name: place.name, lang };
    // Pass null origin to ensure Map component activates Automatic GPS mode
    onSelectDestination(dest, null);
  };

  const handleOpenMap = () => {
    // Pass null origin to ensure Map component activates Automatic GPS mode
    onSelectDestination({ lang }, null);
  };

  const handleSearchSubmit = () => {
    if (results.length > 0) {
      handleSelectDest(results[0]);
    } else {
      handleOpenMap();
    }
  };

  const stats = [
    { value: '3', label: tr.landing.stats.metro },
    { value: '25+', label: tr.landing.stats.stops },
    { value: '24/7', label: tr.landing.stats.nav },
    { value: '🆓', label: tr.landing.stats.free },
  ];

  return (
    <div className={`lp ${mounted ? 'lp--in' : ''}`} id="landing-page">

      {/* ── NAV BAR ── */}
      <nav className="lp-nav" id="lp-nav">
        <div className="lp-logo" id="lp-logo">
          <span className="lp-logo-icon">🚇</span>
          SubToWay
        </div>

        <div className="lp-lang-cluster" id="lp-lang-cluster">
          {PINNED.map(l => (
            <button
              key={l.code}
              id={`lang-btn-${l.code}`}
              onClick={() => setLang(l.code)}
              className={`lp-flag-btn ${lang === l.code ? 'lp-flag-btn--active' : ''} ${l.flag.length <= 4 ? 'lp-flag-btn--text' : ''}`}
              title={l.name}
              aria-label={l.name}
            >
              {l.flag}
            </button>
          ))}

          <div className="lp-more-wrap" ref={moreRef}>
            <button
              id="lang-more-btn"
              className={`lp-flag-btn lp-more-btn ${showMore ? 'lp-flag-btn--active' : ''}`}
              onClick={() => setShowMore(s => !s)}
              title={tr.landing.moreLanguages}
              aria-label={tr.landing.moreLanguages}
            >
              🌐
            </button>

            {showMore && (
              <div className="lp-more-panel" id="lp-more-panel">
                <div className="lp-more-title">{tr.landing.chooseLanguage}</div>
                <div className="lp-more-grid">
                  {MORE_LANGS.map(l => (
                    <button
                      key={l.code}
                      id={`lang-extra-${l.code}`}
                      className={`lp-more-item ${lang === l.code ? 'lp-more-item--active' : ''}`}
                      onClick={() => { setLang(l.code); setShowMore(false); }}
                      aria-label={l.name}
                    >
                      <span className="lp-more-flag">{l.flag}</span>
                      <span className="lp-more-name">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main className="lp-hero" id="lp-hero">
        <div className="lp-hero-content" id="lp-hero-content">
          <h1 className="lp-title" id="lp-title">
            {tr.landing.heroTitle}
          </h1>
          <p className="lp-subtitle" id="lp-subtitle">
            {tr.landing.heroSubtitle}
          </p>

          <div className="lp-search-wrap" id="lp-search-wrap">
            {gpsLocation && (
              <div className="lp-origin-pill">
                <span className="lp-origin-value">{tr.myLocation}</span>
              </div>
            )}
            {/* DESTINATION SEARCH */}
            <div className={`lp-search-box ${isOpen ? 'lp-search-box--open' : ''} lp-dest-box`}>
              <div className="lp-search-input-wrap">
                <input
                  type="text"
                  className="lp-search-input"
                  placeholder={tr.searchDestPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => { setIsOpen(results.length > 0); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  autoComplete="off"
                />
                {loading && <div className="lp-loader-mini"></div>}
              </div>

              {isOpen && (
                <div className="lp-results">
                  {results.map((r, i) => (
                    <div key={i} className="lp-result-item" onClick={() => handleSelectDest(r)}>
                      <div className="lp-res-text">
                        <div className="lp-res-name">{r.name.split(',')[0]}</div>
                        <div className="lp-res-addr">{r.name.split(',').slice(1).join(',')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!gpsLocation && (
              <div className="lp-gps-fallback-msg">
                {tr.landing.writeDownOrigin}
              </div>
            )}
          </div>

          <button
            className="lp-open-map-btn"
            id="open-map-btn"
            onClick={handleOpenMap}
          >
            {tr.landing.openMap}
          </button>

        </div>

        {/* Stats */}
        <div className="lp-stats" id="lp-stats">
          {stats.map((s, i) => (
            <div className="lp-stat-item" key={i}>
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ── ABOUT ── */}
      <section className="lp-about" id="about">
        <div className="lp-about-inner">
          <div className="lp-about-badge">{tr.about.badge}</div>
          <h2 className="lp-about-title">{tr.about.title}</h2>
          <p className="lp-about-para">{tr.about.p1}</p>
          <p className="lp-about-para">
            {tr.about.p2.replace(tr.about.highlight, '').trim()}
            {' '}<strong>{tr.about.highlight}</strong>.
          </p>
          <div className="lp-about-pills">
            {tr.about.pills.map(pill => (
              <span className="lp-pill" key={pill}>{pill}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        {tr.landing.footer}
      </footer>
    </div>
  );
}
