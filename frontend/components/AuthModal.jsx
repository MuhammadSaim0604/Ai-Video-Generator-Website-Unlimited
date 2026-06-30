"use client";
import { useEffect } from "react";
import { X, Sparkles, Video, Image } from "lucide-react";
import { GoogleAuthButton } from "./GoogleAuthButton";

export default function AuthModal({ open, onClose, message }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm glass rounded-2xl border border-primary/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-center mb-1">
            Sign in to Generate
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-5">
            {message || "Create a free account to start generating unlimited AI videos and images."}
          </p>

          <div className="space-y-2 mb-5">
            {[
              { icon: Video, text: "Unlimited AI video generations" },
              { icon: Image, text: "Unlimited AI image generations" },
              { icon: Sparkles, text: "All your creations saved automatically" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <GoogleAuthButton />

          <p className="text-center text-[11px] text-muted-foreground/60 mt-4">
            New or returning — one click gets you in · Free forever
          </p>
        </div>
      </div>
    </div>
  );
}
