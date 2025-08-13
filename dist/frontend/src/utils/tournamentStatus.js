"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusDisplayInfo = exports.getTournamentStatus = void 0;
const getTournamentStatus = (dateString) => {
    const tournamentDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    tournamentDate.setHours(0, 0, 0, 0);
    return tournamentDate < today ? 'completed' : 'scheduled';
};
exports.getTournamentStatus = getTournamentStatus;
const getStatusDisplayInfo = (status) => {
    switch (status) {
        case 'scheduled':
            return {
                label: 'Scheduled',
                color: 'bg-blue-100 text-blue-800'
            };
        case 'completed':
            return {
                label: 'Completed',
                color: 'bg-green-100 text-green-800'
            };
        default:
            return {
                label: 'Unknown',
                color: 'bg-gray-100 text-gray-800'
            };
    }
};
exports.getStatusDisplayInfo = getStatusDisplayInfo;
//# sourceMappingURL=tournamentStatus.js.map