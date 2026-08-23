const PATHS = {
  government: (
    <>
      <path d="M4 9 12 3l8 6" />
      <path d="M3 9h18" />
      <path d="M7 9v9M12 9v9M17 9v9" />
      <path d="M3 20h18" />
    </>
  ),
  hospital: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  bank: (
    <>
      <ellipse cx="12" cy="6.5" rx="7" ry="2.3" />
      <path d="M5 6.5v5.2c0 1.27 3.13 2.3 7 2.3s7-1.03 7-2.3V6.5" />
      <path d="M5 11.7v5.2c0 1.27 3.13 2.3 7 2.3s7-1.03 7-2.3v-5.2" />
    </>
  ),
  other: (
    <>
      <path d="M4.5 9 5.5 4h13l1 5" />
      <path d="M4.5 9v10h15V9" />
      <path d="M9.5 19v-5.5h5V19" />
    </>
  ),
}

export default function SectorIcon({ sector, size = 20, className = '' }) {
  const path = PATHS[sector] || PATHS.other
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}
