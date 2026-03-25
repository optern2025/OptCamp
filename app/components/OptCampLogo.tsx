import Image from "next/image";
import type React from "react";

interface OptCampLogoProps {
  className?: string;
  scale?: number;
  isScrolled?: boolean;
}

const OptCampLogo: React.FC<OptCampLogoProps> = ({
  className = "",
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
        className="h-auto w-36 xs:w-44 sm:w-52 md:w-60 transition-all duration-500"
      />
    </div>
  </div>
);

export default OptCampLogo;
