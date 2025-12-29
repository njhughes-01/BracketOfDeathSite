"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const players_1 = __importDefault(require("./players"));
const tournaments_1 = __importDefault(require("./tournaments"));
const tournamentResults_1 = __importDefault(require("./tournamentResults"));
const data_1 = __importDefault(require("./data"));
const admin_1 = __importDefault(require("./admin"));
const users_1 = __importDefault(require("./users"));
const profile_1 = __importDefault(require("./profile"));
const router = (0, express_1.Router)();
const auth_1 = __importDefault(require("./auth"));
const settings_1 = __importDefault(require("./settings"));
const system_1 = __importDefault(require("./system"));
// Mount all route modules
router.use("/auth", auth_1.default);
router.use("/players", players_1.default);
router.use("/tournaments", tournaments_1.default);
router.use("/tournament-results", tournamentResults_1.default);
router.use("/data", data_1.default);
router.use("/admin", admin_1.default);
router.use("/admin/users", users_1.default);
router.use("/profile", profile_1.default);
router.use("/settings", settings_1.default);
router.use("/system", system_1.default);
// API info endpoint
router.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Bracket of Death API",
        version: "1.0.0",
        endpoints: {
            players: "/api/players",
            tournaments: "/api/tournaments",
            tournamentResults: "/api/tournament-results",
            data: "/api/data",
            admin: "/api/admin",
            users: "/api/admin/users",
            profile: "/api/profile",
        },
        documentation: "See CLAUDE.md for API documentation",
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map