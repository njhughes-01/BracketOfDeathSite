export type BracketType = 'single_elimination' | 'double_elimination' | 'round_robin_playoff' | undefined;

export const isRoundRobin = (bracketType: BracketType): boolean => bracketType === 'round_robin_playoff';

export const getDefaultRoundFor = (bracketType: BracketType): 'RR_R1' | 'quarterfinal' =>
  isRoundRobin(bracketType) ? 'RR_R1' : 'quarterfinal';

export const getRoundOptions = (bracketType: BracketType): Array<{ value: string; label: string }> => {
  const options: Array<{ value: string; label: string }> = [];
  if (isRoundRobin(bracketType)) {
    options.push(
      { value: 'RR_R1', label: 'Round Robin - Round 1' },
      { value: 'RR_R2', label: 'Round Robin - Round 2' },
      { value: 'RR_R3', label: 'Round Robin - Round 3' },
    );
  }
  options.push(
    { value: 'quarterfinal', label: 'Quarterfinals' },
    { value: 'semifinal', label: 'Semifinals' },
    { value: 'final', label: 'Final' },
  );
  if (bracketType === 'double_elimination') {
    options.push(
      { value: 'lbr-round-1', label: 'Losers R1' },
      { value: 'lbr-semifinal', label: 'Losers Semifinal' },
      { value: 'lbr-final', label: 'Losers Final' },
      { value: 'grand-final', label: 'Grand Final' },
    );
  }
  return options;
};
