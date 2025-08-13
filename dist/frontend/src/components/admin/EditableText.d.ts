import React from 'react';
interface EditableTextProps {
    value: string;
    onSave: (value: string) => Promise<void> | void;
    placeholder?: string;
    multiline?: boolean;
    className?: string;
    displayClassName?: string;
    editClassName?: string;
    disabled?: boolean;
    required?: boolean;
    maxLength?: number;
    validator?: (value: string) => string | null;
}
declare const EditableText: React.FC<EditableTextProps>;
export default EditableText;
//# sourceMappingURL=EditableText.d.ts.map