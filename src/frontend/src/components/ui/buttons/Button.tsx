import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: string;
  iconPosition?: "left" | "right";
  loading?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-black hover:bg-white hover:scale-105 shadow-lg shadow-primary/20 font-bold",
  secondary:
    "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 font-bold",
  danger:
    "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold",
  ghost: "text-slate-400 hover:text-white hover:bg-white/5 font-medium",
  success:
    "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 sm:px-5 py-2.5 rounded-xl",
  lg: "px-6 py-3 text-lg rounded-xl",
};

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  children,
  className = "",
  ...props
}) => {
  const classes = [
    "inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] transition-all",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "flex-1 sm:flex-none",
    disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconEl = icon && !loading && (
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
  );

  const spinner = loading && (
    <span className="material-symbols-outlined text-[20px] animate-spin">
      progress_activity
    </span>
  );

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {spinner}
      {!loading && iconPosition === "left" && iconEl}
      {children && <span>{children}</span>}
      {!loading && iconPosition === "right" && iconEl}
    </button>
  );
};

export default Button;
