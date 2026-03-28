"use client";

import { useEffect, useRef, useState } from "react";

interface ConfettiBurstProps {
  active: boolean;
}

interface ParticleStyle {
  id: string;
  left: string;
  top: string;
  width: string;
  height: string;
  background: string;
  animationDelay: string;
  animationDuration: string;
  transform: string;
  "--drift-x": string;
  "--drift-y": string;
}

const COLORS = [
  "#22d3ee",
  "#67e8f9",
  "#facc15",
  "#fb7185",
  "#34d399",
  "#f97316",
  "#a3e635",
  "#f8fafc",
];

function createParticles(count: number): ParticleStyle[] {
  return Array.from({ length: count }, () => {
    const size = 6 + Math.random() * 12;
    const left = 6 + Math.random() * 88;
    const top = 8 + Math.random() * 24;
    const driftX = -220 + Math.random() * 440;
    const driftY = 360 + Math.random() * 420;
    const rotate = -180 + Math.random() * 360;
    const duration = 2.8 + Math.random() * 1.8;
    const delay = Math.random() * 0.7;

    return {
      id: `particle-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`,
      left: `${left}%`,
      top: `${top}%`,
      width: `${size}px`,
      height: `${Math.max(4, size * (0.45 + Math.random() * 0.55))}px`,
      background:
        COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#22d3ee",
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      transform: `rotate(${rotate}deg)`,
      "--drift-x": `${driftX}px`,
      "--drift-y": `${driftY}px`,
    };
  });
}

export function ConfettiBurst({ active }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<ParticleStyle[]>([]);
  const previousActiveRef = useRef(false);

  useEffect(() => {
    if (active && !previousActiveRef.current) {
      setParticles(createParticles(220));
    } else if (!active && previousActiveRef.current) {
      setParticles([]);
    }

    previousActiveRef.current = active;
  }, [active]);

  if (!active || particles.length === 0) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      >
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="absolute animate-[confetti-fall_var(--duration)_cubic-bezier(0.12,0.8,0.24,1)_forwards]"
            style={{
              ...particle,
              ["--duration" as string]: particle.animationDuration,
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -24px, 0) scale(0.8) rotate(0deg);
          }
          8% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--drift-x), var(--drift-y), 0)
              scale(1.05) rotate(960deg);
          }
        }
      `}</style>
    </>
  );
}
