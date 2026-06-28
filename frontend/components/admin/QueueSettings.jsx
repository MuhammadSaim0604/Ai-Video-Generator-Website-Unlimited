'use client';
import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle } from 'lucide-react';
import { Slider } from '../ui/slider';
import { adminGetQueueSettings, adminUpdateQueueSettings } from '../../lib/api';

export default function QueueSettings({ initialSettings, onSaved }) {
  const [settings, setSettings] = useState({
    image_concurrency: 10,
    sd_video_concurrency: 5,
    hd_video_concurrency: 3,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        image_concurrency: initialSettings.image_concurrency || 10,
        sd_video_concurrency: initialSettings.sd_video_concurrency || 5,
        hd_video_concurrency: initialSettings.hd_video_concurrency || 3,
      });
    } else {
      adminGetQueueSettings().then((s) => {
        if (s.image_concurrency) setSettings(s);
      }).catch(() => {});
    }
  }, [initialSettings]);

  async function handleSave() {
    setLoading(true);
    try {
      await adminUpdateQueueSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const QUEUE_CONFIGS = [
    {
      key: 'image_concurrency',
      label: 'Image Queue Concurrency',
      desc: 'Max simultaneous image generation jobs processed at once.',
      min: 1, max: 50,
      hint: 'Higher = more images processed at once, but uses more Pixverse account slots.',
    },
    {
      key: 'sd_video_concurrency',
      label: 'SD Video Queue Concurrency',
      desc: 'Max simultaneous 360p/540p video jobs.',
      min: 1, max: 20,
      hint: 'SD videos use standard account credits.',
    },
    {
      key: 'hd_video_concurrency',
      label: 'HD Video Queue Concurrency',
      desc: 'Max simultaneous 720p/1080p video jobs.',
      min: 1, max: 10,
      hint: 'HD videos consume high_quality_times from accounts. Keep this low.',
    },
  ];

  return (
    <div className="glass rounded-xl p-5 space-y-6 max-w-2xl">
      <h2 className="font-semibold flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" />
        Queue Concurrency Settings
      </h2>

      <p className="text-xs text-muted-foreground">
        These settings control how many jobs are processed simultaneously in each queue.
        Each Pixverse account can handle max 2 concurrent generations across all queues.
        The system automatically distributes jobs across available accounts.
      </p>

      <div className="space-y-8">
        {QUEUE_CONFIGS.map(({ key, label, desc, min, max, hint }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <span className="text-2xl font-bold text-primary min-w-[2.5rem] text-right">
                {settings[key]}
              </span>
            </div>
            <Slider
              min={min}
              max={max}
              step={1}
              value={[settings[key]]}
              onValueChange={([v]) => setSettings((prev) => ({ ...prev, [key]: v }))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{min}</span>
              <span className="text-xs text-amber-400/70">{hint}</span>
              <span>{max}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {loading ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
