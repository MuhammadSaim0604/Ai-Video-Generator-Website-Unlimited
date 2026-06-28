'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Settings, List, LogOut,
  RefreshCw, Loader2, Video, Image as ImageIcon,
  Activity, Zap, AlertCircle
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import AccountsUpload from '../../../components/admin/AccountsUpload';
import QueueSettings from '../../../components/admin/QueueSettings';
import StatsCards from '../../../components/admin/StatsCards';
import {
  adminGetMe, adminLogout, adminGetDashboard,
  adminGetJobs, adminGetAccounts, adminToggleAccount, adminSyncCredits
} from '../../../lib/api';
import { subscribeAdmin } from '../../../lib/socket';
import { formatRelativeTime } from '../../../lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'accounts', label: 'Accounts', icon: Users },
  { id: 'queue', label: 'Queue Settings', icon: Settings },
  { id: 'jobs', label: 'Jobs', icon: List },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  // Auth check
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

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'jobs') loadJobs();
  }, [activeTab, loadJobs]);

  // Real-time updates
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
    const updated = accounts.map((a) => a.id === id ? { ...a, is_active: !a.is_active } : a);
    setAccounts(updated);
  }

  async function handleSyncCredits(id) {
    await adminSyncCredits(id);
    loadDashboard();
  }

  const STATUS_COLORS = {
    queued: 'outline', processing: 'processing', completed: 'success', failed: 'destructive',
  };

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
        {/* Header */}
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {dashboard ? <StatsCards data={dashboard} /> : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}

            {/* Queue Status */}
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
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Queued</span>
                          <span className="font-medium">{stats.queued || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing</span>
                          <span className="font-medium text-blue-400">{stats.processing || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium text-emerald-400">{stats.completed || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Failed</span>
                          <span className="font-medium text-red-400">{stats.failed || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Chart (7 days) */}
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

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <AccountsUpload onUploaded={loadDashboard} />

            <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Pixverse Accounts ({accounts.length})</h2>
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
                        <td className="px-4 py-3 text-right font-mono">{acc.remaining_credits}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={acc.high_quality_times > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {acc.high_quality_times}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
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
                              onClick={() => handleSyncCredits(acc.id)}
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

        {/* Queue Settings Tab */}
        {activeTab === 'queue' && (
          <QueueSettings initialSettings={dashboard?.settings} onSaved={loadDashboard} />
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Recent Jobs</h2>
              <button onClick={loadJobs} className="text-xs text-muted-foreground hover:text-foreground">
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
                    <tr key={job.job_id} className="border-b border-border/40 hover:bg-white/3">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          {job.queue_type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
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
    </div>
  );
}
