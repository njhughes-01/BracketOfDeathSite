import React from 'react';
import type { Match, TeamSeed } from '../../types/api';
interface BracketViewProps {
    matches: Match[];
    teams: TeamSeed[];
    currentRound?: string;
    onMatchClick?: (match: Match) => void;
    showScores?: boolean;
    editable?: boolean;
}
declare const BracketView: React.FC<BracketViewProps>;
export default BracketView;
//# sourceMappingURL=BracketView.d.ts.map