import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// 1. Mock factories
jest.mock("../../src/backend/models/Tournament", () => ({
  Tournament: {
    findById: jest.fn(),
  },
}));

jest.mock("../../src/backend/models/Match", () => ({
  Match: {
    find: jest.fn(),
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
  },
}));

// 2. Imports (These will be satisfied by the mocks above)
import { Tournament } from "../../src/backend/models/Tournament";
import { Match } from "../../src/backend/models/Match";
import { LiveTournamentController } from "../../src/backend/controllers/LiveTournamentController";
import { MatchController } from "../../src/backend/controllers/MatchController";

describe("Round Robin Lifecycle", () => {
  let ctl: any;
  let matchCtl: any;
  let tournamentMock: any;
  let matchesMock: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    ctl = new LiveTournamentController();
    matchCtl = new MatchController();
    matchesMock = [];

    tournamentMock = {
      _id: "rr_tourn",
      status: "active",
      bracketType: "round_robin", // Pure RR
      players: ["p1", "p2", "p3", "p4"],
      generatedTeams: [
        { teamId: "t1", players: [{ playerId: "p1" }] },
        { teamId: "t2", players: [{ playerId: "p2" }] },
        { teamId: "t3", players: [{ playerId: "p3" }] },
        { teamId: "t4", players: [{ playerId: "p4" }] },
      ],
      save: jest.fn<any>().mockResolvedValue(true),
      toObject: function () {
        return this;
      },
    };

    // Configure Mocks
    const mockQuery = {
      populate: jest.fn<any>().mockReturnThis(),
      lean: jest.fn<any>().mockReturnThis(),
      exec: jest.fn<any>().mockResolvedValue(tournamentMock),
      then: function (resolve: any) {
        resolve(tournamentMock);
      },
    };

    (Tournament.findById as jest.Mock).mockReturnValue(mockQuery);

    (Match.find as jest.Mock).mockImplementation((query: any = {}) => {
      let results = [...matchesMock];
      if (query && typeof query === "object") {
        if (query.tournamentId)
          results = results.filter(
            (m) => m.tournamentId === query.tournamentId,
          );
        if (query.round)
          results = results.filter((m) => m.round === query.round);
      }
      return {
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue(results),
        }),
        sort: jest.fn().mockReturnValue(results),
      };
    });

    (Match.findOne as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn<any>().mockResolvedValue(null),
    });

    (Match.insertMany as unknown as any).mockImplementation(
      (newMatches: any[]) => {
        matchesMock.push(...newMatches);
        return Promise.resolve(newMatches);
      },
    );

    (Match.deleteMany as unknown as any).mockResolvedValue({ deletedCount: 0 });
  });

  it("1. Initializes Round Robin in correct phase", () => {
    const phase = ctl.calculateTournamentPhase(tournamentMock, matchesMock);
    expect(phase.phase).toBe("round_robin");
    expect(phase.currentRound).toBe("RR_R1");
  });

  it("2. Generates Matches for RR_R1", async () => {
    // Mock request context
    const req = { params: { id: "rr_tourn" }, body: { round: "RR_R1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await matchCtl.generateMatches(req, res, jest.fn());

    expect(Match.insertMany).toHaveBeenCalled();
    expect(matchesMock.length).toBeGreaterThan(0);
    expect(matchesMock[0].round).toBe("RR_R1");

    // Ensure success response
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  describe("Playoff Variant", () => {
    beforeEach(() => {
      tournamentMock.bracketType = "round_robin_playoff";
      // Simulate that RR is done (RR_R3 completed) and current round is RR_R3
      // We set the matchesMock to simulate a state where "Start Bracket" is valid
      // Usually this requires currentRound to be RR_R3 and matches completed

      // Note: executeTournamentAction('start_bracket') calls startBracket()
      // startBracket() checks if (phase.canAdvance) or similar if strict
      // But controller.startBracket logic usually just creates the next round matches.
    });

    it("3. Transition to Bracket works", async () => {
      const req = {
        params: { id: "rr_tourn" },
        body: { action: "start_bracket" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await ctl.executeTournamentAction(req, res, jest.fn());

      // Should generate Quarterfinals
      expect(Match.insertMany).toHaveBeenCalled();
      // We can check what was inserted from the last call
      const inserted = (Match.insertMany as jest.Mock).mock
        .calls[0][0] as any[];
      expect(inserted.length).toBeGreaterThan(0);
      expect(["quarterfinal", "semifinal"]).toContain(inserted[0].round);
    });
  });
});
