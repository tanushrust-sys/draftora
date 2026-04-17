'use client';

import { useEffect } from 'react';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlBg = html.style.backgroundColor;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyBg = body.style.backgroundColor;
    const previousBodyMargin = body.style.margin;
    const previousBodyOverflowX = body.style.overflowX;
    const previousBodyOverflowY = body.style.overflowY;

    html.style.backgroundColor = '#e8f4ff';
    html.style.overflow = 'hidden';
    body.style.backgroundColor = '#e8f4ff';
    body.style.margin = '0';
    body.style.overflowX = 'hidden';
    body.style.overflowY = 'auto';

    return () => {
      html.style.backgroundColor = previousHtmlBg;
      html.style.overflow = previousHtmlOverflow;
      body.style.backgroundColor = previousBodyBg;
      body.style.margin = previousBodyMargin;
      body.style.overflowX = previousBodyOverflowX;
      body.style.overflowY = previousBodyOverflowY;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100dvh',
        overflowX: 'hidden',
        overflowY: 'auto',
        background:
          'radial-gradient(140% 70% at 10% -20%, rgba(98, 171, 255, 0.34) 0%, transparent 54%), radial-gradient(110% 72% at 92% -8%, rgba(71, 205, 255, 0.28) 0%, transparent 58%), linear-gradient(165deg, #e7f2ff 0%, #eef7ff 42%, #f3f9ff 100%)',
        color: '#123252',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(rgba(79, 142, 202, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 142, 202, 0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.24,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-8rem auto auto 50%',
          width: '42rem',
          height: '28rem',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          filter: 'blur(130px)',
          background: 'radial-gradient(ellipse, rgba(72, 157, 246, 0.42) 0%, transparent 72%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-3.5rem',
          bottom: '-6rem',
          width: '24rem',
          height: '24rem',
          borderRadius: '50%',
          pointerEvents: 'none',
          filter: 'blur(130px)',
          background: 'radial-gradient(circle, rgba(45, 189, 224, 0.22) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-5rem',
          bottom: '16%',
          width: '18rem',
          height: '18rem',
          borderRadius: '50%',
          pointerEvents: 'none',
          filter: 'blur(100px)',
          background: 'radial-gradient(circle, rgba(55, 150, 255, 0.24) 0%, transparent 72%)',
        }}
      />
      <div
        style={{
          width: 'min(440px, calc(100vw - 1.5rem))',
          marginInline: 'auto',
          display: 'flex',
          alignItems: 'stretch',
          minHeight: '100dvh',
          paddingTop: 'clamp(1.1rem, 4vh, 2rem)',
          paddingBottom: 'clamp(1.1rem, 4vh, 2rem)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <section
          style={{
            width: '100%',
            flex: '1',
            minHeight: 'calc(100dvh - clamp(2.2rem, 8vh, 4rem))',
            borderRadius: '24px',
            padding: '0.5rem',
            background:
              'linear-gradient(160deg, rgba(255, 255, 255, 0.82) 0%, rgba(236, 247, 255, 0.72) 46%, rgba(229, 245, 255, 0.62) 100%)',
            border: '1px solid rgba(74, 148, 214, 0.28)',
            boxShadow:
              '0 38px 98px rgba(62, 122, 176, 0.28), 0 10px 28px rgba(84, 145, 198, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-18%',
              left: '-4%',
              width: '110%',
              height: '36%',
              background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.56) 0%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ padding: '1.1rem 1rem 0.65rem' }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.74rem',
                lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: '0.24em',
                fontWeight: 800,
                color: '#0a72c7',
              }}
            >
              {eyebrow}
            </p>
            <h2
              style={{
                margin: '0.85rem 0 0',
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: 'clamp(2rem, 5vw, 2.35rem)',
                lineHeight: 1,
                color: '#08213b',
                textShadow: '0 2px 10px rgba(255,255,255,0.45)',
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: '0.85rem 0 0',
                color: '#355b7e',
                lineHeight: 1.7,
                fontSize: '0.95rem',
              }}
            >
              {description}
            </p>
          </div>
          <div style={{ padding: '0.2rem 1rem 0.9rem' }}>{children}</div>
          {footer ? <div style={{ padding: '0 1rem 0.8rem' }}>{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
