import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Page } from '../components/ui';

export default function DashboardPage() {
  const [data, setData] = useState<null | Awaited<ReturnType<typeof api.dashboard>>>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .dashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message ?? 'Failed to load dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Page title="Dashboard">
      {err && (
        <Card className="mb-4 border-rose-500/30 bg-rose-500/10 text-rose-200">
          {err}
        </Card>
      )}
      {!data ? (
        <div className="text-slate-300">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="text-xs font-semibold text-slate-400">Total</div>
            <div className="mt-1 text-3xl font-extrabold">{data.counts.total}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold text-slate-400">In progress</div>
            <div className="mt-1 text-3xl font-extrabold">{data.counts.IN_PROGRESS}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold text-slate-400">Overdue</div>
            <div className="mt-1 text-3xl font-extrabold">{data.overdue.length}</div>
          </Card>

          <div className="md:col-span-3">
            <Card>
              <div className="mb-3 text-sm font-bold">Overdue tasks</div>
              {data.overdue.length === 0 ? (
                <div className="text-sm text-slate-400">No overdue tasks.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {data.overdue.map((t) => (
                    <div key={t.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-xs text-slate-400">
                          {t.project.name} • due {new Date(t.dueDate).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-rose-200">{t.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}

