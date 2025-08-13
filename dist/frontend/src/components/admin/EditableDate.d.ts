import React from 'react';
interface EditableDateProps {
    value: string | Date;
    onSave: (value: string) => Promise<void> | void;
    placeholder?: string;
    className?: string;
    displayClassName?: string;
    editClassName?: string;
    disabled?: boolean;
    required?: boolean;
    min?: string;
    max?: string;
    validator?: (value: string) => string | null;
}
declare const EditableDate: React.FC<EditableDateProps>;
export default EditableDate;
//# sourceMappingURL=EditableDate.d.ts.map