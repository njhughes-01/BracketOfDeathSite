"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBracketMatches = exports.getNextRound = exports.MatchStatuses = exports.MatchRounds = void 0;
exports.MatchRounds = [
    'round-robin',
    'round-of-64',
    'round-of-32',
    'round-of-16',
    'quarterfinal',
    'semifinal',
    'final',
    'third-place',
];
exports.MatchStatuses = [
    'scheduled',
    'in-progress',
    'completed',
    'cancelled',
    'postponed',
];
// Helper function to determine the next round
const getNextRound = (currentRound) => {
    const roundOrder = [
        'round-robin',
        'round-of-64',
        'round-of-32',
        'round-of-16',
        'quarterfinal',
        'semifinal',
        'final'
    ];
    const currentIndex = roundOrder.indexOf(currentRound);
    if (currentIndex === -1 || currentIndex === roundOrder.length - 1) {
        return null;
    }
    return roundOrder[currentIndex + 1];
};
exports.getNextRound = getNextRound;
// Helper function to calculate required matches for bracket size
const calculateBracketMatches = (playerCount) => {
    if (playerCount < 2)
        return 0;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    return bracketSize - 1; // Single elimination bracket
};
exports.calculateBracketMatches = calculateBracketMatches;
//# sourceMappingURL=match.js.map