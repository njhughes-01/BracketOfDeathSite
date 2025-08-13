import React from 'react';
interface SelectOption {
    value: string;
    label: string;
}
interface EditableSelectProps {
    value: string;
    options: SelectOption[];
    onSave: (value: string) => Promise<void> | void;
    placeholder?: string;
    className?: string;
    displayClassName?: string;
    editClassName?: string;
    disabled?: boolean;
    required?: boolean;
    validator?: (value: string) => string | null;
}
declare const EditableSelect: React.FC<EditableSelectProps>;
export default EditableSelect;
//# sourceMappingURL=EditableSelect.d.ts.map