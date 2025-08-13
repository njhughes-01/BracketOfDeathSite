"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const LoadingSpinner = ({ size = 'md', color = 'blue' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2'
    };
    const colorClasses = {
        blue: 'border-blue-600 border-t-transparent',
        gray: 'border-gray-400 border-t-transparent',
        white: 'border-white border-t-transparent'
    };
    return (<div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`} role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>);
};
exports.default = LoadingSpinner;
//# sourceMappingURL=LoadingSpinner.js.map