import React from "react";
import type { User } from "../../types/user";

interface UserDetailModalProps {
    user: User;
    onClose: () => void;
    onDeleteUser?: (user: User) => void;
    onResetPassword?: (user: User) => void;
    onToggleStatus?: (user: User) => void;
    onToggleAdminRole?: (user: User) => void;
    onToggleSuperAdminRole?: (user: User) => void;
    onUpdateUser?: (user: User, data: { firstName: string; lastName: string; email: string; gender: string }) => Promise<void>;
}


const UserDetailModal: React.FC<UserDetailModalProps> = ({
    user,
    onClose,
    onDeleteUser,
    onResetPassword,
    onToggleStatus,
    onToggleAdminRole,
    onToggleSuperAdminRole,
    onUpdateUser,
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        email: "",
        gender: "",
    });
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                email: user.email || "",
                gender: user.gender || "",
            });
        }
    }, [user]);

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "superadmin":
                return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
            case "admin":
                return "bg-red-500/20 text-red-400 border border-red-500/30";
            case "user":
                return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
            default:
                return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
        }
    };

    const handleSave = async () => {
        if (onUpdateUser) {
            try {
                setLoading(true);
                await onUpdateUser(user, { ...formData });
                setIsEditing(false);
            } catch (error) {
                console.error("Failed to update user", error);
                alert("Failed to update user");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1c2230] rounded-2xl border border-white/10 w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-red-900/40 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    {onUpdateUser && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute top-4 right-16 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors flex items-center gap-1 px-3"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            <span className="text-sm font-bold">Edit</span>
                        </button>
                    )}
                </div>

                {/* User Info Header */}
                <div className="px-8 relative -mt-12 flex flex-col sm:flex-row items-end sm:items-end gap-6 mb-8">
                    <div className="size-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-4 border-[#1c2230] flex items-center justify-center text-white font-bold text-3xl shadow-xl">
                        {(user.fullName || user.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 pb-2 text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-white">
                            {user.fullName || user.username}
                        </h2>
                        <div className="text-slate-400 font-mono">@{user.username}</div>
                    </div>
                    <div className="pb-2">
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${user.enabled
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                        >
                            <span
                                className={`size-2 rounded-full ${user.enabled ? "bg-green-500" : "bg-red-500"}`}
                            ></span>
                            {user.enabled ? "Active Account" : "Account Disabled"}
                        </span>
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-8">
                    {/* Details Section */}
                    {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/5 p-6 rounded-xl border border-white/10">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Gender
                                </label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-bold transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-white transition-colors flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Email Address
                                </label>
                                <div className="flex items-center gap-2 text-slate-200">
                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">
                                        mail
                                    </span>
                                    {user.email}
                                    {user.emailVerified && (
                                        <span
                                            className="material-symbols-outlined text-green-500 text-[18px]"
                                            title="Verified Email"
                                        >
                                            verified
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Gender
                                </label>
                                <div className="flex items-center gap-2 text-slate-200 capitalize">
                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">
                                        transgender
                                    </span>
                                    {user.gender || "Not specified"}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    User ID
                                </label>
                                <div className="flex items-center gap-2 text-slate-400 font-mono text-sm truncate">
                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">
                                        fingerprint
                                    </span>
                                    {user.id}
                                </div>
                            </div>

                            <div className="col-span-1 sm:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Assigned Roles
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {user.roles.map((role) => (
                                        <span
                                            key={role}
                                            className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase rounded-lg ${getRoleBadgeColor(role)}`}
                                        >
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditing && (
                        <>
                            <div className="h-px bg-white/10"></div>

                            {/* Actions Section */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">
                                        settings
                                    </span>
                                    Account Actions
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Security Actions */}
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase">
                                            Security & Access
                                        </p>
                                        {onResetPassword && (
                                            <button
                                                onClick={() => onResetPassword(user)}
                                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                                            >
                                                <span className="flex items-center gap-3 text-slate-200 group-hover:text-white">
                                                    <span className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            lock_reset
                                                        </span>
                                                    </span>
                                                    Reset Password
                                                </span>
                                                <span className="material-symbols-outlined text-slate-600 group-hover:text-white transition-colors">
                                                    chevron_right
                                                </span>
                                            </button>
                                        )}
                                        {onToggleStatus && (
                                            <button
                                                onClick={() => onToggleStatus(user)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors group ${user.enabled
                                                    ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/20"
                                                    : "bg-green-500/5 hover:bg-green-500/10 border-green-500/20"
                                                    }`}
                                            >
                                                <span className={`flex items-center gap-3 ${user.enabled ? "text-red-400" : "text-green-400"}`}>
                                                    <span className={`p-2 rounded-lg ${user.enabled ? "bg-red-500/20" : "bg-green-500/20"}`}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {user.enabled ? "block" : "check_circle"}
                                                        </span>
                                                    </span>
                                                    {user.enabled ? "Disable Account" : "Enable Account"}
                                                </span>
                                                <span className={`material-symbols-outlined transition-colors ${user.enabled ? "text-red-500/50 group-hover:text-red-500" : "text-green-500/50 group-hover:text-green-500"}`}>
                                                    chevron_right
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Role Management */}
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase">
                                            Role Management
                                        </p>
                                        {onToggleAdminRole && (
                                            <button
                                                onClick={() => onToggleAdminRole(user)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors group ${user.isAdmin
                                                    ? "bg-slate-700/30 hover:bg-slate-700/50 border-white/5"
                                                    : "bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/20"
                                                    }`}
                                            >
                                                <span className={`flex items-center gap-3 ${user.isAdmin ? "text-slate-300" : "text-purple-400"}`}>
                                                    <span className={`p-2 rounded-lg ${user.isAdmin ? "bg-slate-600/30 text-slate-400" : "bg-purple-500/20 text-purple-400"}`}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            shield_person
                                                        </span>
                                                    </span>
                                                    {user.isAdmin ? "Remove Admin Role" : "Promote to Admin"}
                                                </span>
                                            </button>
                                        )}
                                        {onToggleSuperAdminRole && (
                                            <button
                                                onClick={() => onToggleSuperAdminRole(user)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors group ${user.isSuperAdmin
                                                    ? "bg-slate-700/30 hover:bg-slate-700/50 border-white/5"
                                                    : "bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/20"
                                                    }`}
                                            >
                                                <span className={`flex items-center gap-3 ${user.isSuperAdmin ? "text-slate-300" : "text-yellow-400"}`}>
                                                    <span className={`p-2 rounded-lg ${user.isSuperAdmin ? "bg-slate-600/30 text-slate-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            verified_user
                                                        </span>
                                                    </span>
                                                    {user.isSuperAdmin ? "Remove Super Admin" : "Promote to Super Admin"}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                {onDeleteUser && (
                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <button
                                            onClick={() => onDeleteUser(user)}
                                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition-all hover:scale-[1.02]"
                                        >
                                            <span className="material-symbols-outlined">delete_forever</span>
                                            Permanently Delete User
                                        </button>
                                        <p className="text-center text-xs text-red-500/50 mt-2">
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDetailModal;
