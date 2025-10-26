import React, { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const MovingBorder = ({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderClassName,
  as: Component = "button",
  ...otherProps
}) => {
  return (
    <Component
      className={cn(
        "relative bg-transparent p-[1px] overflow-hidden",
        containerClassName
      )}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(90deg, transparent, transparent),
            linear-gradient(90deg, #000000, #3b82f6, #60A5FA, #000000)
          `,
          backgroundSize: "300% 100%",
          animation: `moveGradient ${duration}ms linear infinite`,
        }}
      >
        <style jsx>{`
          @keyframes moveGradient {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </div>

      <div
        className={cn(
          "relative bg-white dark:bg-black rounded-lg",
          className
        )}
      >
        {children}
      </div>
    </Component>
  );
};
