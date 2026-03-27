import React from "react";

type ColCount = 1 | 2 | 3 | 4 | 5 | 6;
type GapSize = 2 | 3 | 4 | 6 | 8;

export interface ResponsiveGridProps {
  cols?: {
    mobile?: ColCount;
    tablet?: ColCount;
    desktop?: ColCount;
  };
  gap?: GapSize;
  className?: string;
  children: React.ReactNode;
}

const mobileColClasses: Record<ColCount, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const tabletColClasses: Record<ColCount, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const desktopColClasses: Record<ColCount, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const gapClasses: Record<GapSize, string> = {
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
};

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 6,
  className = "",
  children,
}) => {
  const classes = [
    "grid",
    mobileColClasses[cols.mobile ?? 1],
    tabletColClasses[cols.tablet ?? 2],
    desktopColClasses[cols.desktop ?? 3],
    gapClasses[gap],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};

export default ResponsiveGrid;
