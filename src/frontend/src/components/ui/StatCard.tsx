import React from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";
import Card from "./Card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  linkTo?: string;
  linkText?: string;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor,
  linkTo,
  linkText,
  loading = false,
  trend,
}) => {
  return (
    <Card variant="gradient">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div
            className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center shadow-sm`}
          >
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {loading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
                {trend && (
                  <span
                    className={`text-sm font-medium ${
                      trend.isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
                  </span>
                )}
              </div>
              {linkTo && linkText && (
                <Link
                  to={linkTo}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  {linkText} →
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
