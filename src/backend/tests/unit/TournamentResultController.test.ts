import { Request, Response } from "express";
import { TournamentResultController } from "../../controllers/TournamentResultController";
import { TournamentResult } from "../../models/TournamentResult";
import { Tournament } from "../../models/Tournament";
import { RequestWithAuth } from "../../controllers/base";

// Mock models
jest.mock("../../models/TournamentResult");
jest.mock("../../models/Tournament");
jest.mock("../../models/Player");

describe("TournamentResultController", () => {
  let controller: TournamentResultController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new TournamentResultController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe("getLeaderboard", () => {
    it("should return leaderboard data successfully", async () => {
      mockReq = {
        query: {
          year: "2025",
          limit: "10",
          sort: "-points",
        },
      };

      const mockAggregatedData = [
        {
          _id: "player1",
          name: "Player One",
          totalWins: 10,
          points: 1000,
        },
      ];

      (TournamentResult.aggregate as jest.Mock).mockResolvedValue(
        mockAggregatedData,
      );

      await controller.getLeaderboard(
        mockReq as Request,
        mockRes as Response,
        nextMock,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAggregatedData,
        }),
      );

      // Verify aggregation pipeline was used
      expect(TournamentResult.aggregate).toHaveBeenCalled();
      const pipeline = (TournamentResult.aggregate as jest.Mock).mock
        .calls[0][0];
      expect(pipeline).toBeInstanceOf(Array);
    });

    it("should handle errors", async () => {
      mockReq = { query: {} };
      const error = new Error("Database failure");
      (TournamentResult.aggregate as jest.Mock).mockRejectedValue(error);

      await controller.getLeaderboard(
        mockReq as Request,
        mockRes as Response,
        nextMock,
      );

      expect(nextMock).toHaveBeenCalledWith(error);
    });

    describe("getAvailableYears", () => {
      it("should return min and max years from tournament data", async () => {
        mockReq = {};

        const mockAggregatedData = [
          {
            _id: null,
            minDate: new Date("2020-06-15"),
            maxDate: new Date("2024-06-15"),
          },
        ];

        (Tournament.aggregate as jest.Mock).mockResolvedValue(
          mockAggregatedData,
        );

        await controller.getAvailableYears(
          mockReq as Request,
          mockRes as Response,
          nextMock,
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: {
              min: 2020,
              max: 2024,
            },
          }),
        );
        expect(Tournament.aggregate).toHaveBeenCalled();
      });

      it("should return default range if no tournaments found", async () => {
        mockReq = {};
        (Tournament.aggregate as jest.Mock).mockResolvedValue([]);

        const currentYear = new Date().getFullYear();
        const DEFAULT_MIN_YEAR = 2008;

        await controller.getAvailableYears(
          mockReq as Request,
          mockRes as Response,
          nextMock,
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: {
              min: DEFAULT_MIN_YEAR,
              max: currentYear,
            },
          }),
        );
      });

      it("should handle errors", async () => {
        mockReq = {};
        const error = new Error("Database failure");
        (Tournament.aggregate as jest.Mock).mockRejectedValue(error);

        await controller.getAvailableYears(
          mockReq as Request,
          mockRes as Response,
          nextMock,
        );

        expect(nextMock).toHaveBeenCalledWith(error);
      });
    });
  });
});
