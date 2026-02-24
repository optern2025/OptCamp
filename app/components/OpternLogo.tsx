import React from "react";

interface OpternLogoProps {
  className?: string;
  showText?: boolean;
  scale?: number;
  isScrolled?: boolean;
}

const OpternLogo: React.FC<OpternLogoProps> = ({
  className = "",
  showText = true,
  scale = 1,
  isScrolled = false,
}) => (
  <div
    className={`flex items-center justify-center gap-2 sm:gap-4 ${className}`}
    style={{
      transform: `scale(${scale})`,
      transformOrigin: isScrolled ? "left center" : "center",
    }}
  >
    <div className="relative flex items-center justify-center shrink-0">
      <svg
        viewBox="0 0 100 100"
        className="w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 transition-all duration-500"
        style={{
          filter:
            "drop-shadow(0 0 1px #fff) drop-shadow(0 0 6px rgba(0, 245, 255, 0.9)) drop-shadow(0 0 15px rgba(0, 245, 255, 0.4))",
        }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M50 10L15 30L50 50L85 30L50 10Z"
          stroke="#00F5FF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M35 42V48C35 48 40 54 50 54C60 54 65 48 65 48V42"
          stroke="#00F5FF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <line x1="22" y1="30" x2="22" y2="40" stroke="#00F5FF" strokeWidth="2" />
        <circle cx="22" cy="42" r="2" fill="#00F5FF" />
        <path
          d="M18 58C18 58 35 63 48 65V88C35 86 18 80 18 80V58Z"
          stroke="#00F5FF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M82 58C82 58 65 63 52 65V88C65 86 82 80 82 80V58Z"
          stroke="#00F5FF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M28 82C35 82 50 82 72 62"
          stroke="#00F5FF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M60 62H72V74"
          stroke="#00F5FF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    {showText && (
      <span
        className="text-xl xs:text-2xl sm:text-4xl font-black tracking-[-0.01em] text-white uppercase"
        style={{
          textShadow:
            "0 0 10px rgba(0, 245, 255, 0.8), 0 0 20px rgba(0, 245, 255, 0.4)",
        }}
      >
        OPTERN
      </span>
    )}
  </div>
);

export default OpternLogo;
