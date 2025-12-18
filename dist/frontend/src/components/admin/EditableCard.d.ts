import React from 'react';
interface EditableCardProps {
    title: string;
    children: React.ReactNode;
    onSave?: () => Promise<void> | void;
    onCancel?: () => void;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'hover' | 'elevated';
    isEditing?: boolean;
    showEditButton?: boolean;
    disabled?: boolean;
}
declare const EditableCard: React.FC<EditableCardProps>;
export default EditableCard;
//# sourceMappingURL=EditableCard.d.ts.map