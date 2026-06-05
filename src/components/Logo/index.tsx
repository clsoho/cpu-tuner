export default function Logo({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animated ? 'logo-pulse' : ''}
    >
      {/* Outer hexagon border */}
      <path
        d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
        stroke="url(#logoGrad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner lightning bolt */}
      <path
        d="M34 12L22 34H30L26 52L42 28H34L34 12Z"
        fill="url(#boltGrad)"
      />
      {/* Speed lines */}
      <path d="M14 24L18 24" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M46 24L50 24" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M46 40L50 40" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M14 40L18 40" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      {/* Defs */}
      <defs>
        <linearGradient id="logoGrad" x1="8" y1="4" x2="56" y2="60">
          <stop stopColor="#3b82f6"/>
          <stop offset="1" stopColor="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="boltGrad" x1="22" y1="12" x2="42" y2="52">
          <stop stopColor="#60a5fa"/>
          <stop offset="1" stopColor="#a78bfa"/>
        </linearGradient>
      </defs>
    </svg>
  )
}
