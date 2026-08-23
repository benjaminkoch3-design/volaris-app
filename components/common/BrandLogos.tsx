// src/components/common/BrandLogos.tsx

import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

// Logo Garmin (Triangle bleu marine / cyan emblématique)
export const GarminLogo: React.FC<LogoProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L1.5 20.5H22.5L12 2ZM12 7.2L18.4 18.5H5.6L12 7.2Z" fill="#007CC3" />
  </svg>
);

// Logo COROS (Bouclier / Flèche rouge sport #F8283B)
export const CorosLogo: React.FC<LogoProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L3 7V17L12 22L21 17V7L12 2ZM17.5 15.2L12 18.3L6.5 15.2V8.8L12 5.7L17.5 8.8V15.2Z"
      fill="#F8283B"
    />
    <path d="M12 8.5L8.5 10.5V14.5L12 16.5L15.5 14.5V10.5L12 8.5Z" fill="#F8283B" />
  </svg>
);

// Logo Strava (Double chevron orange officiel #FC5200)
export const StravaLogo: React.FC<LogoProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.926 15.772h4.172"
      fill="#FC5200"
    />
  </svg>
);

// Logo Apple Health (Pomme blanche)
export const AppleHealthLogo: React.FC<LogoProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.99 1.73-.86 2.76.99.08 2.01-.51 2.57-1.26z"
      fill="#F5F5F7"
    />
  </svg>
);

// Logo Polar (Rouge Polar #E1000F)
export const PolarLogo: React.FC<LogoProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07A6.002 6.002 0 0 1 6.07 12H5v-2h1.07A6.002 6.002 0 0 1 11 4.07V3h2v1.07A6.002 6.002 0 0 1 17.93 10H19v2h-1.07A6.002 6.002 0 0 1 13 16.93z"
      fill="#E1000F"
    />
  </svg>
);