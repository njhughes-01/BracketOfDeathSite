import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fullWidth?: boolean;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ fullWidth = true, error, className = "", ...props }, ref) => {
    const classes = [
      "min-h-[44px] bg-background-dark border rounded-xl text-white placeholder:text-slate-500",
      "focus:outline-none focus:border-primary transition-colors px-4 py-3",
      fullWidth ? "w-full" : "",
      error ? "border-red-500/50" : "border-white/10",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <textarea ref={ref} className={classes} {...props} />;
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
