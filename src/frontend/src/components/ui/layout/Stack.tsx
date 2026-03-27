import React from "react";

type GapSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

export interface StackProps {
  direction?: "horizontal" | "vertical" | "responsive";
  gap?: GapSize;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  className?: string;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

const gapClasses: Record<GapSize, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
};

const alignClasses: Record<NonNullable<StackProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClasses: Record<NonNullable<StackProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

const directionClasses: Record<NonNullable<StackProps["direction"]>, string> = {
  horizontal: "flex-row",
  vertical: "flex-col",
  responsive: "flex-col sm:flex-row",
};

const Stack: React.FC<StackProps> = ({
  direction = "vertical",
  gap = 4,
  align,
  justify,
  wrap = false,
  className = "",
  children,
  as: Component = "div",
}) => {
  const classes = [
    "flex",
    directionClasses[direction],
    gapClasses[gap],
    align ? alignClasses[align] : "",
    justify ? justifyClasses[justify] : "",
    wrap ? "flex-wrap" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={classes}>{children}</Component>;
};

export default Stack;
