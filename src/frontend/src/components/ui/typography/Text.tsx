import React from "react";

export interface TextProps {
  size?: "xs" | "sm" | "base" | "lg";
  color?: "white" | "muted" | "error" | "success" | "accent";
  responsive?: boolean;
  className?: string;
  children: React.ReactNode;
  as?: "p" | "span" | "div";
}

const sizeClasses: Record<NonNullable<TextProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const responsiveSizeClasses: Record<NonNullable<TextProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm sm:text-base",
  base: "text-base sm:text-lg",
  lg: "text-lg sm:text-xl",
};

const colorClasses: Record<NonNullable<TextProps["color"]>, string> = {
  white: "text-white",
  muted: "text-slate-400",
  error: "text-red-400",
  success: "text-emerald-400",
  accent: "text-accent",
};

const Text: React.FC<TextProps> = ({
  size = "base",
  color = "muted",
  responsive = false,
  className = "",
  children,
  as: Component = "p",
}) => {
  const classes = [
    responsive ? responsiveSizeClasses[size] : sizeClasses[size],
    colorClasses[color],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={classes}>{children}</Component>;
};

export default Text;
