import React from 'react';
import type { CreateUserInput } from '../../types/user';
interface CreateUserFormProps {
    onSubmit: (userData: CreateUserInput) => Promise<void>;
    loading?: boolean;
    onCancel?: () => void;
}
declare const CreateUserForm: React.FC<CreateUserFormProps>;
export default CreateUserForm;
//# sourceMappingURL=CreateUserForm.d.ts.map