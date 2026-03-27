import React from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: string;
  error?: string;
}

const sizeClasses: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3",
  lg: "px-5 py-3.5 text-lg",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      fullWidth = true,
      icon,
      error,
      className = "",
      ...props
    },
    ref,
  ) => {
    const inputClasses = [
      "min-h-[44px] bg-background-dark border rounded-xl text-white placeholder:text-slate-500",
      "focus:outline-none focus:border-primary transition-colors",
      sizeClasses[size],
      fullWidth ? "w-full" : "",
      icon ? "pl-10" : "",
      error ? "border-red-500/50" : "border-white/10",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (icon) {
      return (
        <div className={`relative ${fullWidth ? "w-full" : ""}`}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">
            {icon}
          </span>
          <input ref={ref} className={inputClasses} {...props} />
        </div>
      );
    }

    return <input ref={ref} className={inputClasses} {...props} />;
  },
);

Input.displayName = "Input";

export default Input;
