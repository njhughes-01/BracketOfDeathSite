"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const LoadingSpinner_1 = __importDefault(require("./LoadingSpinner"));
const Card_1 = __importDefault(require("./Card"));
const StatCard = ({ title, value, icon, iconColor, linkTo, linkText, loading = false, trend }) => {
    return (<Card_1.default variant="gradient">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center shadow-sm`}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {loading ? (<div className="flex items-center space-x-2">
              <LoadingSpinner_1.default size="sm"/>
              <span className="text-sm text-gray-500">Loading...</span>
            </div>) : (<>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {trend && (<span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                  </span>)}
              </div>
              {linkTo && linkText && (<react_router_dom_1.Link to={linkTo} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200">
                  {linkText} →
                </react_router_dom_1.Link>)}
            </>)}
        </div>
      </div>
    </Card_1.default>);
};
exports.default = StatCard;
//# sourceMappingURL=StatCard.js.map