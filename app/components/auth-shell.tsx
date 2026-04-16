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

    html.style.backgroundColor = '#01040b';
    html.style.overflow = 'hidden';
    body.style.backgroundColor = '#01040b';
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
        background: 'radial-gradient(ellipse 85% 60% at 50% 0%, #03131f 0%, #020814 55%, #01040b 100%)',
        color: '#e8fbff',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-8rem auto auto 50%',
          width: '38rem',
          height: '26rem',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          filter: 'blur(120px)',
          background: 'radial-gradient(ellipse, rgba(56, 189, 248, 0.18) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-5rem',
          bottom: '-7rem',
          width: '22rem',
          height: '22rem',
          borderRadius: '50%',
          pointerEvents: 'none',
          filter: 'blur(120px)',
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.12) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          width: 'min(440px, calc(100vw - 1.5rem))',
          marginInline: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
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
            borderRadius: '22px',
            padding: '0.5rem',
            background: 'linear-gradient(160deg, rgba(3, 23, 38, 0.96) 0%, rgba(2, 12, 24, 0.96) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.16)',
            boxShadow: '0 32px 90px rgba(2, 18, 38, 0.72), inset 0 1px 0 rgba(125, 211, 252, 0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.1rem 1rem 0.65rem' }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.74rem',
                lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: '0.24em',
                fontWeight: 700,
                color: 'rgba(103, 232, 249, 0.92)',
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
                color: '#ffffff',
                textShadow: '0 2px 12px rgba(0,0,0,0.28)',
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: '0.85rem 0 0',
                color: 'rgba(199, 249, 255, 0.78)',
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
