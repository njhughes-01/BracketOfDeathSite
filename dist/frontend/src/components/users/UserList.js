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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const Card_1 = __importDefault(require("../ui/Card"));
const LoadingSpinner_1 = __importDefault(require("../ui/LoadingSpinner"));
const UserList = ({ users, loading = false, onEditUser, onDeleteUser, onResetPassword, onToggleStatus, onToggleAdminRole, }) => {
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [roleFilter, setRoleFilter] = (0, react_1.useState)('');
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = !roleFilter || user.roles.includes(roleFilter);
        return matchesSearch && matchesRole;
    });
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'user':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    if (loading) {
        return (<Card_1.default padding="lg">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner_1.default />
          <span className="ml-2 text-gray-600">Loading users...</span>
        </div>
      </Card_1.default>);
    }
    return (<Card_1.default padding="lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Users</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
          </div>
          <div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (<div className="text-center py-8">
          <p className="text-gray-500">
            {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
          </p>
        </div>) : (<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (<tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(user.fullName || user.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName || user.username}
                        </div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    {user.emailVerified ? (<div className="text-sm text-green-600">✓ Verified</div>) : (<div className="text-sm text-yellow-600">⚠ Unverified</div>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (<span key={role} className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(role)}`}>
                          {role}
                        </span>))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'}`}>
                      {user.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {onEditUser && (<button onClick={() => onEditUser(user)} className="text-blue-600 hover:text-blue-900">
                          Edit
                        </button>)}
                      {onResetPassword && (<button onClick={() => onResetPassword(user)} className="text-yellow-600 hover:text-yellow-900">
                          Reset Password
                        </button>)}
                      {onToggleStatus && (<button onClick={() => onToggleStatus(user)} className={user.enabled
                        ? 'text-red-600 hover:text-red-900'
                        : 'text-green-600 hover:text-green-900'}>
                          {user.enabled ? 'Disable' : 'Enable'}
                        </button>)}
                      {onToggleAdminRole && (<button onClick={() => onToggleAdminRole(user)} className={user.isAdmin
                        ? 'text-orange-600 hover:text-orange-900'
                        : 'text-purple-600 hover:text-purple-900'}>
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>)}
                      {onDeleteUser && (<button onClick={() => onDeleteUser(user)} className="text-red-600 hover:text-red-900">
                          Delete
                        </button>)}
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </Card_1.default>);
};
exports.default = UserList;
//# sourceMappingURL=UserList.js.map