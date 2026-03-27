import React from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps {
  level?: HeadingLevel;
  responsive?: boolean;
  className?: string;
  children: React.ReactNode;
}

const baseClasses: Record<HeadingLevel, string> = {
  1: "text-3xl font-bold text-white tracking-tight",
  2: "text-2xl font-bold text-white tracking-tight",
  3: "text-xl font-bold text-white",
  4: "text-lg font-semibold text-white",
  5: "text-base font-semibold text-white",
  6: "text-sm font-semibold text-white",
};

const responsiveClasses: Record<HeadingLevel, string> = {
  1: "text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight",
  2: "text-2xl sm:text-3xl font-bold text-white tracking-tight",
  3: "text-lg sm:text-xl font-bold text-white",
  4: "text-base sm:text-lg font-semibold text-white",
  5: "text-sm sm:text-base font-semibold text-white",
  6: "text-xs sm:text-sm font-semibold text-white",
};

const Heading: React.FC<HeadingProps> = ({
  level = 2,
  responsive = false,
  className = "",
  children,
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const classes = [
    responsive ? responsiveClasses[level] : baseClasses[level],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes}>{children}</Tag>;
};

export default Heading;
