import React from 'react';
interface EditableNumberProps {
    value: number | undefined;
    onSave: (value: number) => Promise<void> | void;
    placeholder?: string;
    className?: string;
    displayClassName?: string;
    editClassName?: string;
    disabled?: boolean;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    integer?: boolean;
    validator?: (value: number) => string | null;
}
declare const EditableNumber: React.FC<EditableNumberProps>;
export default EditableNumber;
//# sourceMappingURL=EditableNumber.d.ts.map