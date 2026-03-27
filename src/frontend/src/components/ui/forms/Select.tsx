import React from "react";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  error?: string;
}

const sizeClasses: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3",
  lg: "px-5 py-3.5 text-lg",
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { size = "md", fullWidth = true, error, className = "", children, ...props },
    ref,
  ) => {
    const classes = [
      "min-h-[44px] bg-background-dark border rounded-xl text-white",
      "focus:outline-none focus:border-primary transition-colors appearance-none",
      sizeClasses[size],
      fullWidth ? "w-full" : "",
      error ? "border-red-500/50" : "border-white/10",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <select ref={ref} className={classes} {...props}>
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";

export default Select;
