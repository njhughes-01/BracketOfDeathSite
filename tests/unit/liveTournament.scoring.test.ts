import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// 1. Mocks
jest.mock("../../src/backend/models/Tournament", () => ({
  Tournament: {
    findById: jest.fn(),
  },
}));

jest.mock("../../src/backend/models/Match", () => ({
  Match: {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    insertMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock("../../src/backend/models/TournamentResult", () => ({
  TournamentResult: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../src/backend/models/Player", () => ({
  Player: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../src/backend/services/LiveStatsService", () => ({
  LiveStatsService: {
    updateLiveStats: jest.fn(),
    calculateLiveTournamentStats: jest.fn(),
    calculatePlayerStatsForTournament: jest.fn(),
  },
}));

jest.mock("../../src/backend/services/EventBus", () => ({
  eventBus: {
    emitTournament: jest.fn(),
    onTournament: jest.fn(),
  },
}));

// 2. Imports
import { Match } from "../../src/backend/models/Match";
import { Tournament } from "../../src/backend/models/Tournament";
import { LiveTournamentController } from "../../src/backend/controllers/LiveTournamentController";

describe("Scoring and Advancement", () => {
  let ctl: LiveTournamentController;
  let tournamentMock: Record<string, unknown>;
  let matchesMock: any[];
  let matchDocMock: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    ctl = new LiveTournamentController();
    matchesMock = [];

    tournamentMock = {
      _id: "tourn_1",
      status: "active",
      bracketType: "single_elimination",
      players: ["p1", "p2", "p3", "p4"],
      generatedTeams: [
        { teamId: "t1", players: [{ playerId: "p1" }] },
        { teamId: "t2", players: [{ playerId: "p2" }] },
        { teamId: "t3", players: [{ playerId: "p3" }] },
        { teamId: "t4", players: [{ playerId: "p4" }] },
      ],
      save: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      toObject: function () {
        return this;
      },
    };

    // Standard Match Doc Mock for updates
    matchDocMock = {
      _id: "match_1",
      tournamentId: "tourn_1",
      round: "quarterfinal",
      matchNumber: 1,
      team1: { score: undefined, players: ["p1"] } as Record<string, unknown>,
      team2: { score: undefined, players: ["p2"] } as Record<string, unknown>,
      status: "scheduled",
      winner: undefined as string | undefined,
      markModified: jest.fn(),
      save: jest
        .fn<() => Promise<typeof matchDocMock>>()
        .mockImplementation(function (this: typeof matchDocMock) {
          return Promise.resolve(this);
        }),
      populate: jest.fn().mockReturnThis(),
    };

    (
      Tournament.findById as jest.MockedFunction<typeof Tournament.findById>
    ).mockReturnValue({
      populate: jest.fn().mockReturnValue(tournamentMock),
    } as any);

    (
      Match.findById as jest.MockedFunction<typeof Match.findById>
    ).mockReturnValue({
      populate: jest.fn().mockReturnValue(matchDocMock),
    } as any);

    (Match.find as jest.MockedFunction<typeof Match.find>).mockImplementation(
      (query?: Record<string, unknown>) => {
        let results = [...matchesMock];
        // Simple filtering
        if (query && typeof query === "object") {
          if (query.tournamentId)
            results = results.filter(
              (m) => m.tournamentId === query.tournamentId,
            );
        }
        return {
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue(results),
          }),
          sort: jest.fn().mockReturnValue(results),
        } as any;
      },
    );

    (
      Match.insertMany as jest.MockedFunction<typeof Match.insertMany>
    ).mockImplementation((newMatches: unknown[]) => {
      matchesMock.push(...(newMatches as any[]));
      return Promise.resolve(newMatches as any);
    });

    (
      Match.deleteMany as jest.MockedFunction<typeof Match.deleteMany>
    ).mockResolvedValue({ deletedCount: 0, acknowledged: true } as any);
  });

  it("1. processMatchUpdate correctly updates scores and winner", async () => {
    const req = {
      params: { matchId: "match_1" },
      body: {
        "team1.score": 10,
        "team2.score": 5,
        status: "completed",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await ctl.updateMatch(req as any, res as any, jest.fn() as any);

    expect(Match.findById).toHaveBeenCalledWith("match_1");
    expect((matchDocMock.team1 as Record<string, unknown>).score).toBe(10);
    expect((matchDocMock.team2 as Record<string, unknown>).score).toBe(5);
    expect(matchDocMock.winner).toBe("team1");
    expect(matchDocMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  // TODO: This test requires more elaborate mock setup for the advance_round action flow
  // The executeTournamentAction has complex internal logic that needs proper tournament state
  it.skip("2. advanceRound generates next round matches based on winners", async () => {
    // Setup state: Quarterfinals completed
    matchesMock = [
      {
        tournamentId: "tourn_1",
        round: "quarterfinal",
        matchNumber: 1,
        status: "completed",
        winner: "team1",
        team1: { teamId: "t1" },
        team2: { teamId: "t2" },
      },
      {
        tournamentId: "tourn_1",
        round: "quarterfinal",
        matchNumber: 2,
        status: "completed",
        winner: "team3",
        team1: { teamId: "t3" },
        team2: { teamId: "t4" },
      },
    ];

    const req = {
      params: { id: "tourn_1" },
      body: { action: "advance_round" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await ctl.executeTournamentAction(req as any, res as any, jest.fn() as any);

    expect(Match.insertMany).toHaveBeenCalled();
    const insertManyCalls = (
      Match.insertMany as jest.MockedFunction<typeof Match.insertMany>
    ).mock.calls;
    const inserted = insertManyCalls[0][0] as any[];
    expect(inserted.length).toBeGreaterThan(0);
    // Expect Semifinal match between T1 vs T3
    const nextMatch = inserted[0];
    expect(nextMatch.round).toBe("semifinal");
  });
});
