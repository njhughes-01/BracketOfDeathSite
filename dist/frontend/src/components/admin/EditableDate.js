"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("../../contexts/AuthContext");
const EditableDate = ({ value, onSave, placeholder = "Click to edit...", className = "", displayClassName = "", editClassName = "", disabled = false, required = false, min, max, validator }) => {
    const { isAdmin } = (0, AuthContext_1.useAuth)();
    const [isEditing, setIsEditing] = (0, react_1.useState)(false);
    const [editValue, setEditValue] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const inputRef = (0, react_1.useRef)(null);
    const formatDateForInput = (dateValue) => {
        if (!dateValue)
            return '';
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (isNaN(date.getTime()))
            return '';
        return date.toISOString().split('T')[0];
    };
    const formatDateForDisplay = (dateValue) => {
        if (!dateValue)
            return placeholder;
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (isNaN(date.getTime()))
            return placeholder;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    (0, react_1.useEffect)(() => {
        setEditValue(formatDateForInput(value));
    }, [value]);
    (0, react_1.useEffect)(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);
    const handleEdit = () => {
        if (!isAdmin || disabled)
            return;
        setIsEditing(true);
        setError(null);
    };
    const validateDate = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return 'Please enter a valid date';
        }
        const minDate = new Date('2009-01-01');
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 10);
        if (date < minDate || date > maxDate) {
            return 'Date must be between 2009 and 10 years in the future';
        }
        if (min && date < new Date(min)) {
            return `Date must be after ${new Date(min).toLocaleDateString()}`;
        }
        if (max && date > new Date(max)) {
            return `Date must be before ${new Date(max).toLocaleDateString()}`;
        }
        if (validator) {
            return validator(dateStr);
        }
        return null;
    };
    const handleSave = async () => {
        if (editValue === formatDateForInput(value)) {
            setIsEditing(false);
            return;
        }
        if (required && !editValue) {
            setError('This field is required');
            return;
        }
        if (editValue) {
            const validationError = validateDate(editValue);
            if (validationError) {
                setError(validationError);
                return;
            }
        }
        setIsLoading(true);
        setError(null);
        try {
            const dateToSave = editValue ? new Date(editValue).toISOString() : '';
            await onSave(dateToSave);
            setIsEditing(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCancel = () => {
        setEditValue(formatDateForInput(value));
        setIsEditing(false);
        setError(null);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
        else if (e.key === 'Escape') {
            handleCancel();
        }
    };
    if (!isAdmin) {
        return (<span className={`${className} ${displayClassName}`}>
        {formatDateForDisplay(value)}
      </span>);
    }
    if (isEditing) {
        return (<div className={`relative ${className}`}>
        <input ref={inputRef} type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} min={min} max={max} disabled={isLoading} className={`input ${editClassName} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}/>
        {isLoading && (<div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>)}
        {error && (<p className="text-red-500 text-xs mt-1">{error}</p>)}
        <div className="flex items-center space-x-2 mt-1">
          <button onClick={handleSave} disabled={isLoading} className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50">
            Save
          </button>
          <button onClick={handleCancel} disabled={isLoading} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
            Cancel
          </button>
        </div>
      </div>);
    }
    return (<span onClick={handleEdit} className={`${className} ${displayClassName} ${!disabled ? 'cursor-pointer hover:bg-gray-100 hover:text-blue-600 rounded px-1 -mx-1 transition-colors' : ''} ${!value ? 'text-gray-400 italic' : ''}`} title={!disabled ? "Click to edit" : undefined}>
      {formatDateForDisplay(value)}
    </span>);
};
exports.default = EditableDate;
//# sourceMappingURL=EditableDate.js.map