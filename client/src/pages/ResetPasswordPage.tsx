import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Button, Card, Input, Label } from '../components/ui';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!token) {
      setErr('This reset link is incomplete. Please use the link from your email again, or request a new reset.');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword({ token, password });
      window.location.assign('/dashboard');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-indigo-950/40">
      <div className="flex flex-1 items-center px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Team Task Manager</p>
            <h1 className="mt-1 text-xl font-bold text-slate-50">Create a new password</h1>
            <p className="mt-2 text-sm text-slate-400">
              Choose a strong password you have not used here before. At least 8 characters, including one number.
            </p>

            {!token ? (
              <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-950/35 p-4 text-sm text-rose-100">
                This reset link is invalid or has expired. You can request a new one from the sign-in page.
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <Label>New password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                </div>
                {err && (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-950/50 p-3 text-sm text-rose-50">{err}</div>
                )}
                <Button disabled={busy} className="w-full py-3">
                  {busy ? 'Saving…' : 'Save password and sign in'}
                </Button>
              </form>
            )}

            <div className="mt-6 border-t border-slate-800 pt-4 text-center text-sm text-slate-500">
              <Link className="font-semibold text-indigo-300 hover:text-indigo-200" to="/login">
                Return to sign in
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
