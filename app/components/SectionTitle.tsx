import React from "react";

interface SectionTitleProps {
    children: React.ReactNode;
    className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
    children,
    className = "",
}) => (
    <h2
        className={`text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-6 md:mb-10 leading-[1.1] ${className}`}
    >
        {children}
    </h2>
);

export default SectionTitle;
