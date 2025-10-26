import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const TypewriterEffect = ({ words, className, cursorClassName }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayedText !== currentWord) {
            setDisplayedText(currentWord.slice(0, displayedText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), 1500);
          }
        } else {
          if (displayedText === "") {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
          } else {
            setDisplayedText(currentWord.slice(0, displayedText.length - 1));
          }
        }
      },
      isDeleting ? 50 : 100
    );

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, wordIndex, words]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className={cursorClassName || "text-blue-500"}
      >
        |
      </motion.span>
    </span>
  );
};
