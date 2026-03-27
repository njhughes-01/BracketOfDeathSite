import React from "react";

export interface ContainerProps {
  padding?: "none" | "sm" | "md" | "lg";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  children: React.ReactNode;
}

const paddingClasses: Record<NonNullable<ContainerProps["padding"]>, string> = {
  none: "",
  sm: "px-3 sm:px-4 py-4 sm:py-5",
  md: "px-4 sm:px-6 py-6 sm:py-8",
  lg: "px-6 sm:px-8 py-8 sm:py-10",
};

const maxWidthClasses: Record<NonNullable<ContainerProps["maxWidth"]>, string> =
  {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-7xl",
    xl: "max-w-[1400px]",
    full: "max-w-full",
  };

const Container: React.FC<ContainerProps> = ({
  padding = "md",
  maxWidth = "lg",
  className = "",
  children,
}) => {
  const classes = [
    "mx-auto",
    paddingClasses[padding],
    maxWidthClasses[maxWidth],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};

export default Container;
