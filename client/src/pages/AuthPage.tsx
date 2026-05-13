import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Card, Input, Label } from '../components/ui';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(name, email, password);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-indigo-950/40">
      <div className="flex flex-1 items-center px-4 py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-2 md:items-center md:gap-12">
          <div className="text-left">
            <div className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">
              Admin/Member RBAC • Projects • Tasks • Dashboard
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl">
              Team Task Manager
            </h1>
            <p className="mt-3 max-w-md text-slate-300">
              Create projects, add teammates, assign tasks, and track progress with a clean dashboard.
            </p>
          </div>

          <Card className="md:justify-self-end md:max-w-md md:w-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-bold">{mode === 'login' ? 'Login' : 'Sign up'}</div>
              <button
                className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                type="button"
              >
                {mode === 'login' ? 'Create account' : 'Have an account?'}
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSubmit}>
              {mode === 'signup' && (
                <div>
                  <Label>Name</Label>
                  <Input
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {mode === 'login' && (
                  <div className="mt-1 text-right">
                    <Link to="/forgot-password" className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>
              {err && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/40 bg-rose-950/50 p-3 text-sm font-medium text-rose-50"
                >
                  {err}
                </div>
              )}
              <Button disabled={busy} className="w-full">
                {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
              </Button>
              {mode === 'signup' && (
                <div className="text-xs text-slate-400">
                  Password: at least 8 characters and include at least one number.
                </div>
              )}
              <div className="text-xs text-slate-400">
                Tip: Create two accounts to demo Admin/Member flows (Admin adds Member to a project).
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

