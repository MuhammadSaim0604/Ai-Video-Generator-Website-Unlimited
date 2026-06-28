import { Video, Image as ImageIcon, Users, Zap, TrendingUp, AlertCircle } from 'lucide-react';

export default function StatsCards({ data }) {
  const { jobs, accounts } = data;

  const activeAccounts = accounts?.filter((a) => a.is_active).length || 0;
  const totalCredits = accounts?.reduce((s, a) => s + (a.remaining_credits || 0), 0) || 0;
  const totalHDTimes = accounts?.reduce((s, a) => s + (a.high_quality_times || 0), 0) || 0;

  const cards = [
    {
      label: "Today's Images",
      value: jobs?.today_images || 0,
      icon: ImageIcon,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: "Today's Videos",
      value: jobs?.today_videos || 0,
      icon: Video,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Today',
      value: jobs?.today_total || 0,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Active Accounts',
      value: activeAccounts,
      icon: Users,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Total Credits',
      value: totalCredits.toLocaleString(),
      icon: Zap,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'HD Times Left',
      value: totalHDTimes,
      icon: AlertCircle,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="glass rounded-xl p-4">
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
