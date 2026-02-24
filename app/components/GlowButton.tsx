import React from "react";

interface GlowButtonProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

const GlowButton: React.FC<GlowButtonProps> = ({
    children,
    className = "",
    onClick,
}) => (
    <button
        onClick={onClick}
        className={`relative group px-6 xs:px-10 md:px-12 py-4 md:py-6 bg-cyan-500 text-black font-black text-base xs:text-lg md:text-xl tracking-tighter uppercase transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(0,245,255,0.7)] active:scale-95 break-words max-w-full ${className}`}
    >
        {children}
    </button>
);

export default GlowButton;
