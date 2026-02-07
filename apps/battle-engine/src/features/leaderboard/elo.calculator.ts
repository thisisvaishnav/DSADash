export type EloOutcome = 'win' | 'loss' | 'draw';

type EloResult = {
  ratingA: number;
  ratingB: number;
};

const K_FACTOR = 32;

const getExpectedScore = (ratingA: number, ratingB: number): number =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

const getOutcomeScore = (outcome: EloOutcome): number => {
  if (outcome === 'win') return 1;
  if (outcome === 'loss') return 0;
  return 0.5;
};

export const calculateEloChange = (
  ratingA: number,
  ratingB: number,
  outcome: EloOutcome,
): EloResult => {
  const expectedA = getExpectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const scoreA = getOutcomeScore(outcome);
  const scoreB = 1 - scoreA;

  return {
    ratingA: Math.round(ratingA + K_FACTOR * (scoreA - expectedA)),
    ratingB: Math.round(ratingB + K_FACTOR * (scoreB - expectedB)),
  };
};
