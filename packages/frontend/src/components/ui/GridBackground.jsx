import React from "react";
import { motion } from "framer-motion";

export const GridBackground = ({ children, className }) => {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 dark:opacity-10" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-black dark:via-transparent dark:to-black pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white dark:from-black dark:via-transparent dark:to-black pointer-events-none" />

      {/* Animated spotlight effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(600px circle at 0% 0%, rgba(59, 130, 246, 0.1), transparent 40%)",
            "radial-gradient(600px circle at 100% 100%, rgba(59, 130, 246, 0.1), transparent 40%)",
            "radial-gradient(600px circle at 0% 0%, rgba(59, 130, 246, 0.1), transparent 40%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
