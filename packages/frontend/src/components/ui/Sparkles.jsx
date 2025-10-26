import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const SparklesCore = ({
  id,
  background,
  minSize,
  maxSize,
  particleDensity,
  className,
  particleColor,
}) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = [];
      const density = particleDensity || 100;

      for (let i = 0; i < density; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * (maxSize - minSize) + minSize,
          duration: Math.random() * 3 + 2,
          delay: Math.random() * 2,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, [minSize, maxSize, particleDensity]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg className="w-full h-full">
        {particles.map((particle) => (
          <motion.circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill={particleColor || "#3b82f6"}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  );
};

export const Sparkles = ({ children, className }) => {
  return (
    <div className={`relative ${className}`}>
      <SparklesCore
        id="sparkles"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={50}
        className="w-full h-full"
        particleColor="#3b82f6"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
