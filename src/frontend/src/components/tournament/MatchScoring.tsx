import React, { useState, useEffect } from 'react';
import type { Match, MatchUpdate } from '../../types/api';
import { EditableNumber } from '../admin';

interface MatchScoringProps {
  match: Match;
  onUpdateMatch: (update: MatchUpdate) => void;
  compact?: boolean;
}

const MatchScoring: React.FC<MatchScoringProps> = ({ match, onUpdateMatch, compact = false }) => {
  const [showDetailedScoring, setShowDetailedScoring] = useState(false);
  const [team1PlayerScores, setTeam1PlayerScores] = useState<Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>>([]);
  const [team2PlayerScores, setTeam2PlayerScores] = useState<Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>>([]);

  // Initialize player scores from match data or create empty arrays
  useEffect(() => {
    if (match.team1.playerScores) {
      setTeam1PlayerScores(match.team1.playerScores);
    } else {
      // Initialize with team players
      const players = Array.isArray(match.team1.players) ? match.team1.players : [];
      setTeam1PlayerScores(players.map((player: any) => ({
        playerId: player._id || player.id || player,
        playerName: player.name || `Player ${player._id || player.id || player}`,
        score: 0
      })));
    }

    if (match.team2.playerScores) {
      setTeam2PlayerScores(match.team2.playerScores);
    } else {
      // Initialize with team players
      const players = Array.isArray(match.team2.players) ? match.team2.players : [];
      setTeam2PlayerScores(players.map((player: any) => ({
        playerId: player._id || player.id || player,
        playerName: player.name || `Player ${player._id || player.id || player}`,
        score: 0
      })));
    }
  }, [match]);

  const updatePlayerScore = (teamNumber: 1 | 2, playerIndex: number, score: number) => {
    if (teamNumber === 1) {
      const updated = [...team1PlayerScores];
      updated[playerIndex] = { ...updated[playerIndex], score };
      setTeam1PlayerScores(updated);

      // Submit update with individual player scores
      onUpdateMatch({
        matchId: match._id,
        team1PlayerScores: updated,
        team2PlayerScores: team2PlayerScores,
        status: 'completed'
      });
    } else {
      const updated = [...team2PlayerScores];
      updated[playerIndex] = { ...updated[playerIndex], score };
      setTeam2PlayerScores(updated);

      // Submit update with individual player scores
      onUpdateMatch({
        matchId: match._id,
        team1PlayerScores: team1PlayerScores,
        team2PlayerScores: updated,
        status: 'completed'
      });
    }
  };

  const team1Total = team1PlayerScores.reduce((sum, player) => sum + player.score, 0);
  const team2Total = team2PlayerScores.reduce((sum, player) => sum + player.score, 0);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{match.team1.teamName}</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">{team1Total}</span>
            <button
              onClick={() => setShowDetailedScoring(!showDetailedScoring)}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Show detailed scoring"
            >
              📊
            </button>
          </div>
        </div>
        <div className="text-center text-gray-400 text-sm">vs</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{match.team2.teamName}</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">{team2Total}</span>
          </div>
        </div>

        {showDetailedScoring && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Individual Player Scores</h4>
            
            {/* Team 1 Players */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">{match.team1.teamName}</p>
              {team1PlayerScores.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between py-1">
                  <span className="text-xs">{player.playerName}</span>
                  <EditableNumber
                    value={player.score}
                    onSave={(score) => updatePlayerScore(1, index, score || 0)}
                    min={0}
                    integer
                    placeholder="0"
                    displayClassName="text-sm font-medium min-w-[1.5rem] text-center"
                  />
                </div>
              ))}
            </div>

            {/* Team 2 Players */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">{match.team2.teamName}</p>
              {team2PlayerScores.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between py-1">
                  <span className="text-xs">{player.playerName}</span>
                  <EditableNumber
                    value={player.score}
                    onSave={(score) => updatePlayerScore(2, index, score || 0)}
                    min={0}
                    integer
                    placeholder="0"
                    displayClassName="text-sm font-medium min-w-[1.5rem] text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full detailed scoring view
  return (
    <div className="space-y-4">
      {/* Team Totals */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{match.team1.teamName}</p>
          <p className="text-2xl font-bold text-blue-600">{team1Total}</p>
        </div>
        <div className="text-gray-400 font-bold">VS</div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{match.team2.teamName}</p>
          <p className="text-2xl font-bold text-blue-600">{team2Total}</p>
        </div>
      </div>

      {/* Individual Player Scoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team 1 */}
        <div className="border rounded-lg p-3">
          <h4 className="font-medium text-gray-700 mb-3">{match.team1.teamName} Players</h4>
          <div className="space-y-2">
            {team1PlayerScores.map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between">
                <span className="text-sm">{player.playerName}</span>
                <EditableNumber
                  value={player.score}
                  onSave={(score) => updatePlayerScore(1, index, score || 0)}
                  min={0}
                  integer
                  placeholder="0"
                  displayClassName="text-lg font-medium text-blue-600 min-w-[2rem] text-center"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 */}
        <div className="border rounded-lg p-3">
          <h4 className="font-medium text-gray-700 mb-3">{match.team2.teamName} Players</h4>
          <div className="space-y-2">
            {team2PlayerScores.map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between">
                <span className="text-sm">{player.playerName}</span>
                <EditableNumber
                  value={player.score}
                  onSave={(score) => updatePlayerScore(2, index, score || 0)}
                  min={0}
                  integer
                  placeholder="0"
                  displayClassName="text-lg font-medium text-blue-600 min-w-[2rem] text-center"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchScoring;