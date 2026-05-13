import React from 'react';
import { Link } from 'react-router-dom';

export function clsx(...v: Array<string | undefined | null | false>) {
  return v.filter(Boolean).join(' ');
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-lg shadow-black/20', className)}>
      {children}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const { variant = 'primary', className, ...rest } = props;
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants =
    variant === 'primary'
      ? 'bg-indigo-500 text-white hover:bg-indigo-400'
      : 'bg-transparent text-slate-100 hover:bg-slate-800';
  return <button className={clsx(base, variants, className)} {...rest} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-50',
        'placeholder:text-slate-500 outline-none ring-0 transition-colors',
        'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25',
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-50',
        'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25',
        props.className,
      )}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-semibold text-slate-300">{children}</div>;
}

export function TopNav({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-bold tracking-wide text-slate-100">
            Team Task Manager
          </Link>
          <Link to="/dashboard" className="text-sm text-slate-300 hover:text-slate-100">
            Dashboard
          </Link>
          <Link to="/projects" className="text-sm text-slate-300 hover:text-slate-100">
            Projects
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-slate-300 sm:block">{userName}</div>
          <Button variant="ghost" onClick={() => void onLogout()}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">{title}</h1>
      </div>
      {children}
    </div>
  );
}

