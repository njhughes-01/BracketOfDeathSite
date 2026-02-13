import { Response } from "express";
import { MatchController } from "../../controllers/MatchController";
import { Match } from "../../models/Match";

// Mock dependencies
jest.mock("../../models/Match");
jest.mock("../../models/Tournament");
jest.mock("../../models/TournamentResult");
jest.mock("../../services/LiveStatsService");
jest.mock("../../services/EventBus");

describe("MatchController", () => {
  let controller: MatchController;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new MatchController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  describe("updateMatch - adminOverride authorization", () => {
    const createMockMatchDoc = (overrides: any = {}) => {
      const doc: any = {
        _id: "match-1",
        tournamentId: "tourn-1",
        matchNumber: 1,
        round: "round-robin-1",
        roundNumber: 1,
        team1: { players: ["p1"], playerNames: ["Player 1"], score: 0 },
        team2: { players: ["p2"], playerNames: ["Player 2"], score: 0 },
        status: "scheduled",
        winner: undefined,
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue({
          _id: "match-1",
          tournamentId: { toString: () => "tourn-1" },
          status: "in-progress",
          ...overrides,
        }),
        ...overrides,
      };
      // Make save return the doc itself by default
      doc.save.mockResolvedValue({
        ...doc,
        tournamentId: { toString: () => "tourn-1" },
      });
      return doc;
    };

    it("should return 403 when non-admin user sends adminOverride", async () => {
      const mockDoc = createMockMatchDoc();
      (Match.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDoc),
      });

      mockReq = {
        params: { matchId: "match-1" },
        body: {
          adminOverride: {
            reason: "Testing override",
            authorizedBy: "hacker@example.com",
          },
          "team1.score": 6,
          "team2.score": 3,
        },
        user: {
          id: "user-1",
          email: "regular@example.com",
          isAdmin: false,
          roles: ["user"],
        },
      };

      await controller.updateMatch(mockReq, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Admin privileges required"),
        }),
      );
      // Ensure save was NOT called
      expect(mockDoc.save).not.toHaveBeenCalled();
    });

    it("should allow admin user to send adminOverride", async () => {
      const mockDoc = createMockMatchDoc();
      (Match.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDoc),
      });

      mockReq = {
        params: { matchId: "match-1" },
        body: {
          adminOverride: {
            reason: "Score exception approved",
            authorizedBy: "admin@example.com",
          },
          status: "completed",
          "team1.score": 7,
          "team2.score": 5,
        },
        user: {
          id: "admin-1",
          email: "admin@example.com",
          isAdmin: true,
          roles: ["admin"],
        },
      };

      await controller.updateMatch(mockReq, mockRes as Response, jest.fn());

      // Should succeed - admin can set adminOverride
      expect(mockDoc.adminOverride).toEqual({
        reason: "Score exception approved",
        authorizedBy: "admin@example.com",
      });
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it("should allow non-admin user to update match without adminOverride", async () => {
      const mockDoc = createMockMatchDoc();
      (Match.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDoc),
      });

      mockReq = {
        params: { matchId: "match-1" },
        body: {
          status: "in-progress",
          team1PlayerScores: [{ playerId: "p1", score: 3 }],
          team2PlayerScores: [{ playerId: "p2", score: 2 }],
        },
        user: {
          id: "user-1",
          email: "user@example.com",
          isAdmin: false,
          roles: ["user"],
        },
      };

      await controller.updateMatch(mockReq, mockRes as Response, jest.fn());

      // Should succeed - no adminOverride in request
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
