"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Navigation_1 = __importDefault(require("./Navigation"));
const Header_1 = __importDefault(require("./Header"));
const Layout = ({ children }) => {
    return (<div className="min-h-screen bg-gray-50">
      <Header_1.default />
      <Navigation_1.default />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>);
};
exports.default = Layout;
//# sourceMappingURL=Layout.js.map