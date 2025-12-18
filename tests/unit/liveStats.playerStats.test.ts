import { jest } from "@jest/globals";

jest.mock(
  "../../src/backend/models/Match",
  () => ({
    Match: {
      aggregate: jest.fn(),
    },
  }),
  { virtual: true },
);

import { LiveStatsService } from "../../src/backend/services/LiveStatsService";

describe("LiveStatsService.calculatePlayerStatsForTournament", () => {
  const { Match } = require("../../src/backend/models/Match");

  it("maps aggregation results into player stats", async () => {
    const mockData = [
      {
        _id: "507f1f77bcf86cd799439011",
        playerName: "Alice",
        totalPoints: 25,
        matchesWithPoints: 3,
        wins: 2,
        losses: 1,
      },
      {
        _id: "507f1f77bcf86cd799439012",
        playerName: "Bob",
        totalPoints: 10,
        matchesWithPoints: 2,
        wins: 1,
        losses: 1,
      },
    ];
    (
      Match.aggregate as jest.MockedFunction<typeof Match.aggregate>
    ).mockResolvedValueOnce(mockData);

    const out = await LiveStatsService.calculatePlayerStatsForTournament(
      "64a1b0c2d3e4f56789012345",
    );
    expect(out).toEqual([
      {
        playerId: "507f1f77bcf86cd799439011",
        playerName: "Alice",
        totalPoints: 25,
        matchesWithPoints: 3,
        wins: 2,
        losses: 1,
      },
      {
        playerId: "507f1f77bcf86cd799439012",
        playerName: "Bob",
        totalPoints: 10,
        matchesWithPoints: 2,
        wins: 1,
        losses: 1,
      },
    ]);
  });
});
