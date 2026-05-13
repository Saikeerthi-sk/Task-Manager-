import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Button, Card, Input, Label } from '../components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [resetPath, setResetPath] = useState<string | null>(null);
  const [emailDispatched, setEmailDispatched] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.forgotPassword({ email: email.trim() });
      setResetPath(res.resetPath ?? null);
      setEmailDispatched(typeof res.emailDispatched === 'boolean' ? res.emailDispatched : null);
      setDone(true);
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
            <h1 className="mt-1 text-xl font-bold text-slate-50">Password reset</h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter the email address for your account. We will send you a secure link to choose a new password.
            </p>

            {done ? (
              <div className="mt-6 space-y-4">
                {resetPath ? (
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-inner">
                    <p className="text-sm font-semibold text-slate-50">Continue</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {emailDispatched === false
                        ? 'We could not send an email to your inbox from this environment. Continue in this browser to set a new password. This step expires in one hour.'
                        : 'Continue in this browser to set a new password. This step expires in one hour.'}
                    </p>
                    <Link
                      to={resetPath}
                      className="mt-4 flex w-full items-center justify-center rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                    >
                      Set new password
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-5">
                    <p className="text-sm font-semibold text-emerald-50">Check your email</p>
                    <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">
                      If an account exists for that address, we have sent a message with a secure link. Please check your
                      inbox and spam folder. The link expires in one hour.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <Label>Work email</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                  />
                </div>
                {err && (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-950/50 p-3 text-sm text-rose-50">{err}</div>
                )}
                <Button disabled={busy} className="w-full py-3">
                  {busy ? 'Sending…' : 'Send reset link'}
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
