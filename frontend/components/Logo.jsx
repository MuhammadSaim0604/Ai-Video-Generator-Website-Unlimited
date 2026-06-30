export default function Logo({ size = 32, showText = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="veo3free logo"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>
        {/* Background rounded square */}
        <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
        {/* Play triangle */}
        <path
          d="M13 12L13 28L28 20L13 12Z"
          fill="white"
          fillOpacity="0.9"
        />
        {/* Lightning bolt accent */}
        <path
          d="M24 8L20 18H26L22 32L30 16H24L24 8Z"
          fill="url(#boltGrad)"
          fillOpacity="0.85"
        />
      </svg>
      {showText && (
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          veo3free
          <span className="text-muted-foreground font-normal text-sm">.fun</span>
        </span>
      )}
    </span>
  );
}
