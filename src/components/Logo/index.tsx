export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#00d4aa" />
          <stop offset="1" stopColor="#4493f8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M14 22 22 14h20l8 8v20l-8 8H22l-8-8V22z" fill="#111820" stroke="url(#lg)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="11" stroke="url(#lg)" strokeWidth="1.2" fill="none" />
      <circle cx="32" cy="32" r="8.5" stroke="rgba(0,212,170,.12)" strokeWidth="0.6" fill="none" />
      <path d="M24 26A10 10 0 0 1 40 26" stroke="#00d4aa" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <line x1="32" y1="32" x2="40" y2="25" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" filter="url(#glow)" />
      <circle cx="32" cy="32" r="3" fill="#00d4aa" filter="url(#glow)" />
      <circle cx="32" cy="32" r="1.2" fill="#fff" />
      <circle cx="14" cy="22" r="1.2" fill="url(#lg)" opacity="0.6" />
      <circle cx="50" cy="22" r="1.2" fill="url(#lg)" opacity="0.6" />
      <circle cx="14" cy="42" r="1.2" fill="url(#lg)" opacity="0.6" />
      <circle cx="50" cy="42" r="1.2" fill="url(#lg)" opacity="0.6" />
    </svg>
  )
}
