import React from 'react';
import type { User } from '../../types/user';
interface UserListProps {
    users: User[];
    loading?: boolean;
    onEditUser?: (user: User) => void;
    onDeleteUser?: (user: User) => void;
    onResetPassword?: (user: User) => void;
    onToggleStatus?: (user: User) => void;
    onToggleAdminRole?: (user: User) => void;
}
declare const UserList: React.FC<UserListProps>;
export default UserList;
//# sourceMappingURL=UserList.d.ts.map