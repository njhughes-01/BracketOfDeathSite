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
            authorizedBy: "hacker@example.com",
          },
          status: "completed",
          "team1.score": 7,
          "team2.score": 5,
        },
        user: {
          id: "admin-1",
          name: "Admin User",
          email: "admin@example.com",
          username: "admin",
          isAuthorized: true,
          isAdmin: true,
          roles: ["admin"],
        },
      };

      await controller.updateMatch(mockReq, mockRes as Response, jest.fn());

      // Should succeed - admin can set adminOverride
      // Server must populate authorizedBy from req.user, not client value
      expect(mockDoc.adminOverride.reason).toBe("Score exception approved");
      expect(mockDoc.adminOverride.authorizedBy).toBe("Admin User");
      expect(mockDoc.adminOverride.timestamp).toBeDefined();
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

    it("should override client-provided authorizedBy with authenticated user info", async () => {
      const mockDoc = createMockMatchDoc();
      (Match.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDoc),
      });

      const spoofedAuthor = "hacker@example.com";
      const now = new Date("2025-01-01T00:00:00Z");
      jest.useFakeTimers().setSystemTime(now);

      mockReq = {
        params: { matchId: "match-1" },
        body: {
          adminOverride: {
            reason: "Score exception",
            authorizedBy: spoofedAuthor,
            timestamp: new Date("2020-01-01T00:00:00Z"),
          },
          status: "completed",
          "team1.score": 6,
          "team2.score": 3,
        },
        user: {
          id: "admin-1",
          name: "Admin User",
          email: "admin@example.com",
          username: "admin_user",
          isAuthorized: true,
          isAdmin: true,
          roles: ["admin"],
        },
      };

      await controller.updateMatch(mockReq, mockRes as Response, jest.fn());

      // Verify that authorizedBy and timestamp are set from server, not client
      expect(mockDoc.adminOverride).toEqual({
        reason: "Score exception",
        authorizedBy: "Admin User", // From req.user.name, NOT spoofed value
        timestamp: now, // From server, NOT client-provided old date
      });
      expect(mockDoc.save).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should use email as fallback if name is not available", async () => {
      const mockDoc = createMockMatchDoc();
      (Match.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDoc),
      });

      mockReq = {
        params: { matchId: "match-1" },
        body: {
          adminOverride: {
            reason: "Invalid score",
            authorizedBy: "spoofed-user",
          },
          status: "completed",
          "team1.score": 5,
          "team2.score": 3,
        },
        user: {
          id: "admin-1",
          name: "",
          email: "real-admin@example.com",
          username: "admin",
          isAuthorized: true,
          isAdmin: true,
          roles: ["admin"],
        },
      };

      await controller.updateMatch(mockReq, mockRes as Response, jest.fn());

      // Should use email since name is not available
      expect(mockDoc.adminOverride.authorizedBy).toBe("real-admin@example.com");
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
