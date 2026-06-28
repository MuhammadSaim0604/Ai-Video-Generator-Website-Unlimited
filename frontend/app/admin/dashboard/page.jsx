'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Settings, List, LogOut,
  RefreshCw, Loader2, Video, Image as ImageIcon,
  Activity, Download, RefreshCcw, DatabaseBackup,
  Upload, HardDrive, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import AccountsUpload from '../../../components/admin/AccountsUpload';
import QueueSettings from '../../../components/admin/QueueSettings';
import StatsCards from '../../../components/admin/StatsCards';
import AdminJobModal from '../../../components/admin/AdminJobModal';
import {
  adminGetMe, adminLogout, adminGetDashboard,
  adminGetJobs, adminToggleAccount, adminSyncCredits,
  adminSyncAll, adminSyncUsed, adminExportAccounts,
  adminExportDb, adminImportDb,
} from '../../../lib/api';
import { subscribeAdmin } from '../../../lib/socket';
import { formatRelativeTime, isVideoJob } from '../../../lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'accounts',  label: 'Accounts',  icon: Users },
  { id: 'settings',  label: 'Settings',  icon: Settings },
  { id: 'jobs',      label: 'Jobs',      icon: List },
];

const STATUS_COLORS = {
  queued: 'outline', processing: 'processing', completed: 'success', failed: 'destructive',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [dashboard, setDashboard]     = useState(null);
  const [jobs, setJobs]               = useState([]);
  const [accounts, setAccounts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [username, setUsername]       = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [syncingAll, setSyncingAll]   = useState(false);
  const [syncingUsed, setSyncingUsed] = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [syncMsg, setSyncMsg]         = useState('');

  useEffect(() => {
    adminGetMe()
      .then((d) => setUsername(d.username))
      .catch(() => router.push('/admin/login'));
  }, [router]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetDashboard();
      setDashboard(data);
      setAccounts(data.accounts || []);
    } catch (err) {
      if (err.message?.includes('401')) router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadJobs = useCallback(async () => {
    try {
      const data = await adminGetJobs({ limit: 50 });
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (activeTab === 'jobs') loadJobs(); }, [activeTab, loadJobs]);

  useEffect(() => {
    const unsub = subscribeAdmin({
      onQueueUpdate: () => loadDashboard(),
      onAccountsUpdated: () => loadDashboard(),
    });
    return unsub;
  }, [loadDashboard]);

  async function handleLogout() {
    await adminLogout().catch(() => {});
    router.push('/admin/login');
  }

  async function handleToggleAccount(id) {
    await adminToggleAccount(id);
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !a.is_active } : a));
  }

  async function handleSyncOne(id) {
    await adminSyncCredits(id);
    loadDashboard();
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    setSyncMsg('');
    try {
      const res = await adminSyncAll();
      setSyncMsg(`Synced ${res.synced} accounts`);
      loadDashboard();
    } catch { setSyncMsg('Sync failed'); }
    finally { setSyncingAll(false); setTimeout(() => setSyncMsg(''), 3000); }
  }

  async function handleSyncUsed() {
    setSyncingUsed(true);
    setSyncMsg('');
    try {
      const res = await adminSyncUsed();
      setSyncMsg(`Synced ${res.synced} used accounts`);
      loadDashboard();
    } catch { setSyncMsg('Sync failed'); }
    finally { setSyncingUsed(false); setTimeout(() => setSyncMsg(''), 3000); }
  }

  async function handleExport() {
    setExporting(true);
    try { await adminExportAccounts(); }
    catch { alert('Export failed'); }
    finally { setExporting(false); }
  }

  const [dbExporting, setDbExporting]   = useState(false);
  const [dbImporting, setDbImporting]   = useState(false);
  const [dbMsg, setDbMsg]               = useState(null); // { type: 'success'|'error', text }

  async function handleDbExport() {
    setDbExporting(true);
    setDbMsg(null);
    try {
      await adminExportDb();
      setDbMsg({ type: 'success', text: 'Backup downloaded successfully' });
    } catch (err) {
      setDbMsg({ type: 'error', text: err.message || 'Export failed' });
    } finally {
      setDbExporting(false);
      setTimeout(() => setDbMsg(null), 4000);
    }
  }

  async function handleDbImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Import backup "${file.name}"? Existing records will be updated with data from this backup.`)) return;
    setDbImporting(true);
    setDbMsg(null);
    try {
      const res = await adminImportDb(file);
      const counts = Object.entries(res.imported || {})
        .map(([t, n]) => `${t}: ${n}`)
        .join(', ');
      setDbMsg({ type: 'success', text: `Import complete — ${counts}` });
      loadDashboard();
    } catch (err) {
      setDbMsg({ type: 'error', text: err.message || 'Import failed' });
    } finally {
      setDbImporting(false);
      e.target.value = '';
      setTimeout(() => setDbMsg(null), 6000);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 glass border-r border-border flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-4 border-b border-border">
          <span className="font-bold gradient-text">VEO 3 Admin</span>
          <p className="text-xs text-muted-foreground mt-0.5">{username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                activeTab === id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold capitalize">{activeTab.replace('_', ' ')}</h1>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {dashboard ? <StatsCards data={dashboard} /> : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}
            {dashboard && (
              <div className="glass rounded-xl p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Queue Status
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(dashboard.queues || {}).map(([queue, stats]) => (
                    <div key={queue} className="rounded-lg bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-2 capitalize">{queue.replace('_', ' ')}</p>
                      <div className="space-y-1 text-sm">
                        {[['Queued', stats.queued, ''], ['Processing', stats.processing, 'text-blue-400'], ['Completed', stats.completed, 'text-emerald-400'], ['Failed', stats.failed, 'text-red-400']].map(([label, val, cls]) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-medium ${cls}`}>{val || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dashboard?.analytics?.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h2 className="font-semibold mb-4">7-Day Analytics</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-right py-2 font-medium">Visitors</th>
                        <th className="text-right py-2 font-medium">Images</th>
                        <th className="text-right py-2 font-medium">Videos</th>
                        <th className="text-right py-2 font-medium">HD Videos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.analytics.map((row) => (
                        <tr key={row.date} className="border-b border-border/40 hover:bg-white/3">
                          <td className="py-2">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="py-2 text-right">{row.total_visitors}</td>
                          <td className="py-2 text-right text-violet-400">{row.total_images_generated}</td>
                          <td className="py-2 text-right text-blue-400">{row.total_videos_generated}</td>
                          <td className="py-2 text-right text-amber-400">{row.total_hd_videos_generated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Accounts Tab ── */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <AccountsUpload onUploaded={loadDashboard} />

            <div className="glass rounded-xl overflow-hidden">
              {/* Accounts header with bulk actions */}
              <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Pixverse Accounts ({accounts.length})</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {syncMsg && (
                    <span className="text-xs text-emerald-400">{syncMsg}</span>
                  )}
                  <button
                    onClick={handleSyncAll}
                    disabled={syncingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Sync credits for all active accounts"
                  >
                    {syncingAll
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCcw className="w-3.5 h-3.5" />}
                    Sync All
                  </button>
                  <button
                    onClick={handleSyncUsed}
                    disabled={syncingUsed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Sync only accounts that have processed jobs"
                  >
                    {syncingUsed
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <DatabaseBackup className="w-3.5 h-3.5" />}
                    Sync Used
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="Export all accounts as importable JSON"
                  >
                    {exporting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Export All
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-right px-4 py-3 font-medium">Credits</th>
                      <th className="text-right px-4 py-3 font-medium">HD Times</th>
                      <th className="text-right px-4 py-3 font-medium">Active Gen</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="border-b border-border/40 hover:bg-white/3">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-xs">{acc.email}</p>
                            <p className="text-muted-foreground text-xs">{acc.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{acc.remaining_credits}</td>
                        <td className="px-4 py-3 text-right text-xs">
                          <span className={acc.high_quality_times > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {acc.high_quality_times}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          <span className={acc.active_generations > 0 ? 'text-blue-400' : 'text-muted-foreground'}>
                            {acc.active_generations}/2
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={acc.is_active ? 'success' : 'destructive'}>
                            {acc.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSyncOne(acc.id)}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5"
                            >
                              Sync
                            </button>
                            <button
                              onClick={() => handleToggleAccount(acc.id)}
                              className={`text-xs px-2 py-1 rounded hover:bg-white/5 ${acc.is_active ? 'text-red-400' : 'text-emerald-400'}`}
                            >
                              {acc.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {accounts.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No accounts yet. Upload a JSON file above.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <QueueSettings initialSettings={dashboard?.settings} onSaved={loadDashboard} />

            {/* Database Backup */}
            <div className="glass rounded-xl p-5 max-w-2xl space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                Database Backup
              </h2>
              <p className="text-xs text-muted-foreground">
                Export a full JSON backup of all tables — accounts, jobs, analytics, settings, admin users.
                Use the same file to restore data on any server running this app.
              </p>

              {/* Status message */}
              {dbMsg && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                  dbMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {dbMsg.type === 'success'
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  {dbMsg.text}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {/* Export */}
                <button
                  onClick={handleDbExport}
                  disabled={dbExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {dbExporting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />}
                  Export Full DB
                </button>

                {/* Import */}
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg glass text-sm font-medium cursor-pointer hover:bg-white/10 transition-colors ${dbImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                  {dbImporting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  {dbImporting ? 'Importing…' : 'Import DB Backup'}
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleDbImport}
                    disabled={dbImporting}
                  />
                </label>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Import uses upsert — it won't delete existing records, only add or update matching ones.
                Generation jobs are skipped if the job ID already exists.
              </p>
            </div>
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {activeTab === 'jobs' && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Recent Jobs <span className="text-xs text-muted-foreground font-normal ml-1">— click any row to view details</span></h2>
              <button onClick={loadJobs} className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-white/5">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Prompt</th>
                    <th className="text-left px-4 py-3 font-medium">Model / Quality</th>
                    <th className="text-left px-4 py-3 font-medium">Account</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.job_id}
                      onClick={() => setSelectedJob(job)}
                      className="border-b border-border/40 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          {isVideoJob(job.queue_type)
                            ? <Video className="w-3 h-3 text-blue-400" />
                            : <ImageIcon className="w-3 h-3 text-violet-400" />}
                          {job.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-xs text-muted-foreground">{job.prompt}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p>{job.display_model}</p>
                        <p className="text-muted-foreground">{job.quality}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">
                        {job.account_email || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_COLORS[job.status] || 'outline'} className="text-[10px]">
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatRelativeTime(job.created_at)}
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No jobs yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Job detail modal */}
      {selectedJob && (
        <AdminJobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
