'use client';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__backdrop auth-shell__backdrop--one" />
      <div className="auth-shell__backdrop auth-shell__backdrop--two" />
      <div className="auth-shell__grid">
        <section className="auth-card-panel">
          <div className="auth-card-panel__header">
            <p className="auth-card-panel__eyebrow">{eyebrow}</p>
            <h2 className="auth-card-panel__title">{title}</h2>
            <p className="auth-card-panel__description">{description}</p>
          </div>
          <div className="auth-card-panel__body">{children}</div>
          {footer ? <div className="auth-card-panel__footer">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
