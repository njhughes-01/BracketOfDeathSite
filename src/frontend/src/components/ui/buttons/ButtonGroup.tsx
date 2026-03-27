import React from "react";

export interface ButtonGroupProps {
  orientation?: "horizontal" | "vertical" | "responsive";
  align?: "start" | "end" | "center" | "stretch";
  reversed?: boolean;
  gap?: 1 | 2 | 3 | 4;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

const orientationClasses: Record<
  NonNullable<ButtonGroupProps["orientation"]>,
  { normal: string; reversed: string }
> = {
  horizontal: { normal: "flex-row", reversed: "flex-row-reverse" },
  vertical: { normal: "flex-col", reversed: "flex-col-reverse" },
  responsive: {
    normal: "flex-col sm:flex-row",
    reversed: "flex-col-reverse sm:flex-row",
  },
};

const alignClasses: Record<NonNullable<ButtonGroupProps["align"]>, string> = {
  start: "justify-start",
  end: "justify-end",
  center: "justify-center",
  stretch: "",
};

const gapClasses: Record<NonNullable<ButtonGroupProps["gap"]>, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
};

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  orientation = "responsive",
  align = "start",
  reversed = false,
  gap = 2,
  fullWidth = false,
  className = "",
  children,
}) => {
  const directionKey = reversed ? "reversed" : "normal";

  const classes = [
    "flex",
    orientationClasses[orientation][directionKey],
    gapClasses[gap],
    alignClasses[align],
    fullWidth ? "w-full" : "w-full sm:w-auto",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};

export default ButtonGroup;
