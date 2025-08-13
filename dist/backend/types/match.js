"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBracketMatches = exports.getNextRound = exports.getRoundNumber = exports.getNextRoundRobinRound = exports.isRoundRobinRound = exports.RoundRobinRounds = exports.MatchStatuses = exports.LegacyMatchRounds = exports.MatchRounds = void 0;
exports.MatchRounds = [
    'RR_R1',
    'RR_R2',
    'RR_R3',
    'round-of-64',
    'round-of-32',
    'round-of-16',
    'quarterfinal',
    'semifinal',
    'final',
    'third-place',
];
exports.LegacyMatchRounds = [
    'round-robin',
    ...exports.MatchRounds
];
exports.MatchStatuses = [
    'scheduled',
    'in-progress',
    'completed',
    'cancelled',
    'postponed',
];
exports.RoundRobinRounds = ['RR_R1', 'RR_R2', 'RR_R3'];
const isRoundRobinRound = (round) => {
    return exports.RoundRobinRounds.includes(round);
};
exports.isRoundRobinRound = isRoundRobinRound;
const getNextRoundRobinRound = (currentRound) => {
    const currentIndex = exports.RoundRobinRounds.indexOf(currentRound);
    if (currentIndex === -1)
        return 'RR_R1';
    if (currentIndex >= exports.RoundRobinRounds.length - 1)
        return 'bracket';
    return exports.RoundRobinRounds[currentIndex + 1];
};
exports.getNextRoundRobinRound = getNextRoundRobinRound;
const getRoundNumber = (round) => {
    if (round === 'RR_R1')
        return 1;
    if (round === 'RR_R2')
        return 2;
    if (round === 'RR_R3')
        return 3;
    if (round === 'quarterfinal')
        return 4;
    if (round === 'semifinal')
        return 5;
    if (round === 'final')
        return 6;
    return 1;
};
exports.getRoundNumber = getRoundNumber;
const getNextRound = (currentRound) => {
    const roundOrder = [
        'RR_R1',
        'RR_R2',
        'RR_R3',
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
const calculateBracketMatches = (playerCount) => {
    if (playerCount < 2)
        return 0;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    return bracketSize - 1;
};
exports.calculateBracketMatches = calculateBracketMatches;
//# sourceMappingURL=match.js.map