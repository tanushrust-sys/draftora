type BrandLogoProps = {
  size?: number;
};

export default function BrandLogo({ size = 36 }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="12" fill="url(#draftoraLogoBg)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <path
        d="M11.8 25.2L22.8 14.2C23.8 13.2 25.45 13.2 26.45 14.2C27.45 15.2 27.45 16.85 26.45 17.85L15.45 28.85H11.8V25.2Z"
        stroke="white"
        strokeWidth="2.35"
        strokeLinejoin="round"
      />
      <path d="M22 15L25.7 18.7" stroke="white" strokeWidth="2.35" strokeLinecap="round" />
      <path d="M21.2 29.1H28.2" stroke="white" strokeWidth="2.35" strokeLinecap="round" />
      <defs>
        <linearGradient id="draftoraLogoBg" x1="4" y1="4" x2="37" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8bff" />
          <stop offset="1" stopColor="#6ecbff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
