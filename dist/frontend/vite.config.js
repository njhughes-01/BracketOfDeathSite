"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || ['localhost'];
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts,
        proxy: {
            '/api': {
                target: 'http://backend:3000',
                changeOrigin: true,
                secure: false,
            },
            '/auth': {
                target: 'http://keycloak:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/auth/, ''),
            }
        }
    },
});
//# sourceMappingURL=vite.config.js.map