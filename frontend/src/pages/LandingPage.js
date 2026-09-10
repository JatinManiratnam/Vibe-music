import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/LandingPage.css';

/* ── SVG Icons ─────────────────────────────────────────── */
const MusicNote = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
    <path d="M9 3v10.55A4 4 0 1 0 11 17V7h4V3H9z" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="menu-icon">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="menu-icon">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const WaveformIcon = () => (
  <svg viewBox="0 0 80 48" fill="none" className="feature-icon-svg">
    <rect x="0"  y="16" width="8" height="16" rx="4" fill="#4F7942" opacity="0.6"/>
    <rect x="12" y="8"  width="8" height="32" rx="4" fill="#4F7942"/>
    <rect x="24" y="0"  width="8" height="48" rx="4" fill="#4F7942"/>
    <rect x="36" y="10" width="8" height="28" rx="4" fill="#4F7942" opacity="0.8"/>
    <rect x="48" y="4"  width="8" height="40" rx="4" fill="#4F7942"/>
    <rect x="60" y="14" width="8" height="20" rx="4" fill="#4F7942" opacity="0.7"/>
    <rect x="72" y="18" width="8" height="12" rx="4" fill="#4F7942" opacity="0.5"/>
  </svg>
);

const CommunityIcon = () => (
  <svg viewBox="0 0 64 48" fill="none" className="feature-icon-svg">
    <circle cx="20" cy="20" r="10" fill="#4F7942" opacity="0.7"/>
    <circle cx="44" cy="20" r="10" fill="#4F7942" opacity="0.9"/>
    <circle cx="32" cy="36" r="10" fill="#4F7942"/>
    <circle cx="20" cy="20" r="5" fill="#121212" opacity="0.5"/>
    <circle cx="44" cy="20" r="5" fill="#121212" opacity="0.5"/>
    <circle cx="32" cy="36" r="5" fill="#121212" opacity="0.5"/>
  </svg>
);

const AIIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="feature-icon-svg">
    <circle cx="32" cy="32" r="20" stroke="#4F7942" strokeWidth="2" opacity="0.4"/>
    <circle cx="32" cy="32" r="12" stroke="#4F7942" strokeWidth="2" opacity="0.7"/>
    <circle cx="32" cy="32" r="5"  fill="#4F7942"/>
    <line x1="32" y1="8"  x2="32" y2="20" stroke="#4F7942" strokeWidth="2" strokeLinecap="round"/>
    <line x1="32" y1="44" x2="32" y2="56" stroke="#4F7942" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8"  y1="32" x2="20" y2="32" stroke="#4F7942" strokeWidth="2" strokeLinecap="round"/>
    <line x1="44" y1="32" x2="56" y2="32" stroke="#4F7942" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ── Feature data ───────────────────────────────────────── */
const FEATURES = [
  {
    id: 'lossless',
    icon: <WaveformIcon />,
    title: 'Lossless Audio',
    desc: 'Stream in 24-bit FLAC for studio-quality sound without a single compromised frequency.',
    tag: 'STUDIO QUALITY',
    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
  },
  {
    id: 'community',
    icon: <CommunityIcon />,
    title: 'Community Driven',
    desc: 'Share and discover music from independent creators who are shaping the next sound.',
    tag: 'INDEPENDENT',
    img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
  },
  {
    id: 'smart',
    icon: <AIIcon />,
    title: 'Smart Recommendations',
    desc: 'AI-powered discovery based on your unique listening patterns and vibe.',
    tag: 'AI POWERED',
    img: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80',
  },
];

/* ── Landing Page Component ─────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="lp-root">

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">

          {/* Logo */}
          <button className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <MusicNote />
            <span>Vibe Music</span>
          </button>

          {/* Center links */}
          <div className="lp-nav__links">
            <button onClick={() => scrollTo('features')}>Features</button>
          </div>

          {/* Right CTA */}
          <div className="lp-nav__cta">
            <Link to="/login"  className="lp-btn--ghost">Sign In</Link>
            <Link to="/register" className="lp-btn--primary">Get Started</Link>
          </div>

          {/* Mobile hamburger */}
          <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`lp-mobile-menu ${menuOpen ? 'lp-mobile-menu--open' : ''}`}>
          <button onClick={() => scrollTo('features')}>Features</button>
          <Link to="/login"    onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} className="lp-btn--primary lp-btn--full">Get Started</Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="lp-hero">
        {/* Background image layer */}
        <div className="lp-hero__bg">
          <img
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&q=85"
            alt="Concert stage lights"
            className="lp-hero__bg-img"
          />
          <div className="lp-hero__bg-overlay" />
        </div>

        <div className="lp-hero__content">
          <span className="lp-pill">✦ Now in Beta</span>

          <h1 className="lp-hero__headline">
            Experience&nbsp;Sound<br />
            in <em className="lp-accent">High Definition.</em>
          </h1>

          <p className="lp-hero__sub">
            Vibe Music delivers studio-grade audio, community-curated playlists,<br className="lp-br" />
            and AI-driven discovery — all in one sleek player.
          </p>

          <div className="lp-hero__actions">
            <Link to="/register" className="lp-btn--primary lp-btn--lg">
              Get Started — It's Free
            </Link>
            <button className="lp-btn--ghost lp-btn--lg" onClick={() => scrollTo('features')}>
              Explore Features
            </button>
          </div>

          {/* Social proof */}
          <div className="lp-social-proof">
            <div className="lp-avatars">
              {[
                'https://i.pravatar.cc/40?img=1',
                'https://i.pravatar.cc/40?img=5',
                'https://i.pravatar.cc/40?img=9',
                'https://i.pravatar.cc/40?img=12',
              ].map((src, i) => (
                <img key={i} src={src} alt="listener" className="lp-avatar" style={{ zIndex: 4 - i }} />
              ))}
            </div>
            <span>Loved by <strong>World Wide</strong> listeners</span>
          </div>
        </div>

        {/* Floating card preview */}
        <div className="lp-hero__card">
          <img
            src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80"
            alt="Album art"
            className="lp-hero__card-art"
          />
          <div className="lp-hero__card-info">
            <span className="lp-hero__card-title">Midnight Canvas</span>
            <span className="lp-hero__card-artist">Luna Waves</span>
            <div className="lp-hero__card-bar">
              <div className="lp-hero__card-fill" />
            </div>
            <span className="lp-hero__card-quality">FLAC · 24-bit · 96kHz</span>
          </div>
          <div className="lp-pulse" />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────── */}
      <section id="features" className="lp-features">
        <div className="lp-section-label">WHAT MAKES US DIFFERENT</div>
        <h2 className="lp-section-title">Built for the True Listener</h2>
        <p className="lp-section-sub">
          Every decision we make starts with one question:<br />
          How does this make music sound better?
        </p>

        <div className="lp-features__grid">
          {FEATURES.map((f) => (
            <div key={f.id} className="lp-feature-card">
              <div className="lp-feature-card__img-wrap">
                <img src={f.img} alt={f.title} className="lp-feature-card__img" />
                <div className="lp-feature-card__img-overlay" />
                <span className="lp-feature-card__tag">{f.tag}</span>
              </div>
              <div className="lp-feature-card__body">
                <div className="lp-feature-card__icon">{f.icon}</div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p  className="lp-feature-card__desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-cta__inner">
          <div className="lp-cta__text">
            <h2>Ready to elevate your listening?</h2>
            <p>Join thousands of music lovers. No credit card required.</p>
          </div>
          <Link to="/register" className="lp-btn--primary lp-btn--lg">
            Start Listening Free →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-logo lp-footer__logo">
            <MusicNote />
            <span>Vibe Music</span>
          </div>
          <p className="lp-footer__copy">© 2026 Vibe Music. All rights reserved.</p>
          <div className="lp-footer__links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
