import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "hover" | "gradient" | "compact";
  padding?: "sm" | "md" | "lg";
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  variant = "default",
  padding = "md",
}) => {
  const baseClasses =
    "bg-white rounded-xl shadow-sm border border-gray-200 transition-shadow duration-200";

  const variantClasses = {
    default: "hover:shadow-md",
    hover:
      "hover:shadow-lg hover:-translate-y-1 transform transition-all duration-200 cursor-pointer",
    gradient: "bg-gradient-to-br from-white to-gray-50 hover:shadow-md",
    compact: "hover:shadow-md",
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const finalClassName = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

  return <div className={finalClassName}>{children}</div>;
};

export default Card;
