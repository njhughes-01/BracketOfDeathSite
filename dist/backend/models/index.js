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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentResult = exports.Tournament = exports.Player = void 0;
var Player_1 = require("./Player");
Object.defineProperty(exports, "Player", { enumerable: true, get: function () { return Player_1.Player; } });
var Tournament_1 = require("./Tournament");
Object.defineProperty(exports, "Tournament", { enumerable: true, get: function () { return Tournament_1.Tournament; } });
var TournamentResult_1 = require("./TournamentResult");
Object.defineProperty(exports, "TournamentResult", { enumerable: true, get: function () { return TournamentResult_1.TournamentResult; } });
__exportStar(require("../types/player"), exports);
__exportStar(require("../types/tournament"), exports);
__exportStar(require("../types/tournamentResult"), exports);
__exportStar(require("../types/common"), exports);
//# sourceMappingURL=index.js.map