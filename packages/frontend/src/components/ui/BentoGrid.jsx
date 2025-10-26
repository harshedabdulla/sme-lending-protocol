import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const BentoGrid = ({ className, children }) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}) => {
  return (
    <motion.div
      whileHover={{
        y: -5,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn(
        "row-span-1  group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 justify-between flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-sans font-bold text-gray-900 dark:text-gray-100 mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-gray-600 dark:text-gray-400 text-xs">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
