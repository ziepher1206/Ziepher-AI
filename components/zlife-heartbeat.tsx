type ZLifeHeartbeatProps = {
  className?: string;
  width?: number;
  height?: number;
};

export function ZLifeHeartbeat({ className = "zlife-pulse", width = 48, height = 18 }: ZLifeHeartbeatProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 64 24"
      width={width}
      height={height}
      fill="none"
      focusable="false"
    >
      <path
        d="M1 12h12l5-9 7 18 7-17 6 14 5-6h20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
