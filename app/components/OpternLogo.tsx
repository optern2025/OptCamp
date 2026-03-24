import Image from "next/image";
import type React from "react";

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
      <Image
        src="/optern-logo.png"
        alt="Optcamp logo"
        width={588}
        height={165}
        priority
        className="h-auto w-28 xs:w-36 sm:w-44 md:w-52 transition-all duration-500"
      />
    </div>

    {showText && (
      <span
        className="text-xl xs:text-2xl sm:text-4xl font-black tracking-[-0.01em] text-white uppercase"
        style={{
          textShadow:
            "0 0 10px rgba(0, 245, 255, 0.8), 0 0 20px rgba(0, 245, 255, 0.4)",
        }}
      >
        OPTCAMP
      </span>
    )}
  </div>
);

export default OpternLogo;
