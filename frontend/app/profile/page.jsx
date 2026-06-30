"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "../../components/Logo";
import { useUserAuthStore } from "../../stores/user/user.auth.store";
import { Video, Image as ImageIcon, Clock, ArrowLeft, Loader2, User, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { isSignedIn, user, logout, isLoaded } = useUserAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.stats) setStats(data.stats); })
      .catch(() => {});
  }, [isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/"><Logo size={28} /></Link>
          <Link href="/studio" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground mb-8">Manage your account and view your generation stats.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: ImageIcon, label: "Images Generated", value: stats ? parseInt(stats.total_images || 0) : "—", color: "from-violet-500/20 to-purple-500/20" },
            { icon: Video, label: "Videos Generated", value: stats ? parseInt(stats.total_videos || 0) : "—", color: "from-blue-500/20 to-cyan-500/20" },
            { icon: Clock, label: "In Progress", value: stats ? parseInt(stats.pending || 0) : "—", color: "from-amber-500/20 to-orange-500/20", className: "col-span-2 sm:col-span-1" },
          ].map(({ icon: Icon, label, value, color, className = "" }) => (
            <div key={label} className={`glass rounded-xl p-5 ${className}`}>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mb-1">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-4 mb-6">
            {user?.picture ? (
              <Image src={user.picture} alt={user.name || "Profile"} width={56} height={56} className="rounded-full ring-2 ring-primary/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
            )}
            <div>
              <div className="font-semibold text-foreground text-lg">{user?.name || "Signed In"}</div>
              {user?.email && <div className="text-sm text-muted-foreground mt-0.5">{user.email}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/studio" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Go to Studio
            </Link>
            <button onClick={logout} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
