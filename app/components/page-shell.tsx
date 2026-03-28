import type { ReactNode } from 'react';

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, description, action, children }: PageShellProps) {
  return (
    <div className="page-shell">
      <div className="page-shell__header">
        <div>
          {eyebrow ? <p className="page-shell__eyebrow">{eyebrow}</p> : null}
          <h1 className="page-shell__title">{title}</h1>
          {description ? <p className="page-shell__description">{description}</p> : null}
        </div>
        {action ? <div className="page-shell__action">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
