import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const AnimatedCard = ({ children, className, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "card-hover group cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
