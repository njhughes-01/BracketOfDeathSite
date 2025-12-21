import React, { useState, useEffect } from 'react';

interface YearRangeInputProps {
    value: string;
    onChange: (value: string) => void;
    availableRange: { min: number, max: number };
}

const YearRangeInput: React.FC<YearRangeInputProps> = ({ value, onChange, availableRange }) => {
    const [localValue, setLocalValue] = useState(value);
    const [isValid, setIsValid] = useState(true);
    const DEBOUNCE_DELAY_MS = 500;

    // Sync local state if parent updates (e.g. clear filters)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const validateInput = (input: string): boolean => {
        if (!input) return true; // Empty is valid (All Time)

        // Simple regex check for allowed characters
        if (!/^[\d\s,-]+$/.test(input)) return false;

        return true;
    };

    // Debounce the update to parent
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isValid && localValue !== value) {
                onChange(localValue);
            }
        }, DEBOUNCE_DELAY_MS);

        return () => clearTimeout(timer);
    }, [localValue, isValid, onChange, value, DEBOUNCE_DELAY_MS]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        const valid = validateInput(newVal);
        setIsValid(valid);
    };

    return (
        <div className="relative group">
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={`e.g. 2025, ${availableRange.min}-${availableRange.max}`}
                className={`bg-[#1c2230] text-white text-sm rounded-xl px-4 py-2 border 
                ${isValid ? 'border-white/10 focus:border-primary' : 'border-red-500 focus:border-red-500'} 
                focus:outline-none w-64 transition-all`}
            />
            <div className="absolute -bottom-5 left-0 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Available: {availableRange.min} - {availableRange.max}. Use comma or hyphen.
            </div>
        </div>
    );
};

export default YearRangeInput;
