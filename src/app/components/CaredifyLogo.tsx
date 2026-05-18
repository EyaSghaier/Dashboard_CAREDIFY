import React from 'react';

interface CaredifyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg';
}

export const CaredifyLogoIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Heart outline */}
    <path
      d="M20 34C20 34 4.5 22.5 4.5 12.5C4.5 7.8 7.8 4.5 12 4.5C15 4.5 17.5 6.2 20 9C22.5 6.2 25 4.5 28 4.5C32.2 4.5 35.5 7.8 35.5 12.5C35.5 22.5 20 34 20 34Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* ECG pulse line through the heart */}
    <polyline
      points="7,17 11,17 13,12 15,22 17,15 19.5,19 21,17 25,17 27,13 29,21 31,17 34,17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const CaredifyLogo: React.FC<CaredifyLogoProps> = ({
  size = 36,
  className = '',
  showText = true,
  textSize = 'md',
}) => {
  const textClasses = {
    sm: 'text-xs tracking-[0.25em]',
    md: 'text-sm tracking-[0.3em]',
    lg: 'text-lg tracking-[0.35em]',
  };

  const subTextClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
          boxShadow: '0 0 20px rgba(14, 165, 233, 0.35)',
        }}
      >
        <CaredifyLogoIcon
          size={Math.round(size * 0.65)}
          className="text-white"
        />
      </div>
      {showText && (
        <div>
          <h1
            className={`font-bold text-[var(--cd-t1)] ${textClasses[textSize]}`}
          >
            CAREDIFY
          </h1>
          <p className={`text-[var(--cd-t4)] tracking-wider ${subTextClasses[textSize]}`}>
            AI Cardiac Care
          </p>
        </div>
      )}
    </div>
  );
};

/** Standalone animated logo for login/splash */
export const CaredifyBrandLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col items-center gap-3 ${className}`}>
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
        boxShadow: '0 0 40px rgba(14, 165, 233, 0.5)',
      }}
    >
      <CaredifyLogoIcon size={46} className="text-white" />
    </div>
    <div className="text-center">
      <h1 className="text-white font-bold tracking-[0.4em] text-2xl">CAREDIFY</h1>
      <p className="text-[#0EA5E9] text-xs tracking-widest mt-0.5 uppercase">
        AI-Powered Cardiac Surveillance
      </p>
    </div>
  </div>
);

/** Custom Message icon for nav */
export const MessageNavIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-4 h-4 ${className}`}
  >
    <path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Small heart inside bubble */}
    <path
      d="M12 10.5C12 10.5 9.5 8.8 9.5 7.3C9.5 6.3 10.2 5.7 11 5.7C11.5 5.7 11.8 5.9 12 6.2C12.2 5.9 12.5 5.7 13 5.7C13.8 5.7 14.5 6.3 14.5 7.3C14.5 8.8 12 10.5 12 10.5Z"
      fill="currentColor"
      opacity="0.7"
    />
  </svg>
);

/** Custom Map/Carte icon for nav */
export const MapNavIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-4 h-4 ${className}`}
  >
    {/* Map pin */}
    <path
      d="M12 2C8.68 2 6 4.68 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.32-2.68-6-6-6z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Pulse dot inside pin */}
    <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    {/* Small pulse lines */}
    <path
      d="M8.5 20h7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);
