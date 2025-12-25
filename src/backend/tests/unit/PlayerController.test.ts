import { Request, Response } from "express";
import { PlayerController } from "../../controllers/PlayerController";
import { Player } from "../../models/Player";
import { Match } from "../../models/Match";
import { RequestWithAuth } from "../../controllers/base";

// Mock models
jest.mock("../../models/Player");
jest.mock("../../models/Match", () => ({
  Match: {
    aggregate: jest.fn(),
  },
}));

// Need to mock the specific instance method of aggregate on the model used inside the controller
// Since the controller uses (this.model as any).db.model('Match').aggregate
// We might need a different approach to mock the match aggregation if it uses db.model

describe("PlayerController", () => {
  let playerController: PlayerController;
  let mockReq: Partial<RequestWithAuth>;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    playerController = new PlayerController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe("getStats", () => {
    it("should return aggregated stats", async () => {
      const mockStats = [
        {
          totalPlayers: 10,
          avgWinningPercentage: 0.5,
          avgBodsPlayed: 5,
          totalChampionships: 20,
        },
      ];
      const mockTopPlayers = [{ name: "Top Player" }];

      (Player.aggregate as jest.Mock).mockResolvedValue(mockStats);
      (Player.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockTopPlayers),
          }),
        }),
      });

      await playerController.getStats(
        mockReq as Request,
        mockRes as Response,
        nextMock,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            overview: mockStats[0],
            topPlayers: mockTopPlayers,
          },
        }),
      );
    });

    it("should handle empty stats", async () => {
      (Player.aggregate as jest.Mock).mockResolvedValue([]);
      (Player.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await playerController.getStats(
        mockReq as Request,
        mockRes as Response,
        nextMock,
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ overview: {} }),
        }),
      );
    });
  });

  describe("getChampions", () => {
    it("should return champions list", async () => {
      mockReq = { query: { min: "2" } };
      const mockChampions = [{ name: "Champ", totalChampionships: 3 }];

      (Player.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockChampions),
        }),
      });

      await playerController.getChampions(
        mockReq as Request,
        mockRes as Response,
        nextMock,
      );

      expect(Player.find).toHaveBeenCalledWith({
        totalChampionships: { $gte: 2 },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockChampions,
        }),
      );
    });
  });

  describe("create (validation)", () => {
    it("should validate games won <= games played", async () => {
      mockReq = {
        body: {
          name: "Invalid Player",
          gamesPlayed: 5,
          gamesWon: 6,
        },
      };

      await playerController.create(
        mockReq as RequestWithAuth,
        mockRes as Response,
        nextMock,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining(
            "Games won cannot exceed games played",
          ),
        }),
      );
    });

    it("should validate winning percentage", async () => {
      mockReq = {
        body: {
          name: "Invalid Player",
          winningPercentage: 1.5,
        },
      };

      await playerController.create(
        mockReq as RequestWithAuth,
        mockRes as Response,
        nextMock,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining(
            "Winning percentage must be between 0 and 1",
          ),
        }),
      );
    });

    it("should pass with valid data calling super.create", async () => {
      mockReq = {
        body: {
          name: "Valid Player",
          gamesPlayed: 10,
          gamesWon: 5,
          winningPercentage: 0.5,
        },
      };

      // Mock super.create behavior (BaseController.create)
      // Since we can't easily mock super, we can check if it calls Model.create
      // BUT BaseController isn't mocked, Player model is.
      (Player.create as jest.Mock).mockResolvedValue({ id: "new-player" });

      await playerController.create(
        mockReq as RequestWithAuth,
        mockRes as Response,
        nextMock,
      );

      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe("update (validation)", () => {
    it("should validate best result vs avg finish", async () => {
      mockReq = {
        params: { id: "123" },
        body: {
          bestResult: 10,
          avgFinish: 5, // Logical error: best result (10th) is worse than avg (5th)?
          // Wait, usually lower number is better in ranks. 1st is best.
          // If bestResult is 10 (10th place), avgFinish is 5 (5th place).
          // This implies they usually finish 5th, but their best is 10th? Impossible.
          // Best result (min) should be <= Avg Finish.
          // If best is 10, avg must be >= 10.
        },
      };

      await playerController.update(
        mockReq as RequestWithAuth,
        mockRes as Response,
        nextMock,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining(
            "Best result cannot be worse than average finish",
          ),
        }),
      );
    });
  });
});
