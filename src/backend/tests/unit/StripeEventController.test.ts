import { Request, Response, NextFunction } from "express";
import { StripeEventController } from "../../controllers/StripeEventController";
import StripeEvent from "../../models/StripeEvent";
import { Types } from "mongoose";

jest.mock("../../models/StripeEvent");
jest.mock("../../utils/logger");

describe("StripeEventController", () => {
  let controller: StripeEventController;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new StripeEventController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
  });

  describe("getEvents", () => {
    it("should return events with default pagination", async () => {
      const mockReq = { query: {} } as Partial<Request>;
      const mockResult = { events: [], total: 0 };
      (StripeEvent.getEvents as jest.Mock).mockResolvedValue(mockResult);

      await controller.getEvents(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(StripeEvent.getEvents).toHaveBeenCalledWith(expect.objectContaining({
        page: 1, limit: 50,
      }));
    });

    it("should pass filters correctly", async () => {
      const tid = new Types.ObjectId().toString();
      const mockReq = {
        query: { type: "checkout.session.completed", tournamentId: tid, page: "2", limit: "10" },
      } as Partial<Request>;
      (StripeEvent.getEvents as jest.Mock).mockResolvedValue({ events: [], total: 0 });

      await controller.getEvents(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeEvent.getEvents).toHaveBeenCalledWith(expect.objectContaining({
        type: "checkout.session.completed",
        page: 2,
        limit: 10,
      }));
    });

    it("should cap limit at 100", async () => {
      const mockReq = { query: { limit: "999" } } as Partial<Request>;
      (StripeEvent.getEvents as jest.Mock).mockResolvedValue({ events: [] });

      await controller.getEvents(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeEvent.getEvents).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100,
      }));
    });

    it("should handle date filters", async () => {
      const mockReq = {
        query: { startDate: "2025-01-01", endDate: "2025-12-31" },
      } as Partial<Request>;
      (StripeEvent.getEvents as jest.Mock).mockResolvedValue({ events: [] });

      await controller.getEvents(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeEvent.getEvents).toHaveBeenCalledWith(expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }));
    });
  });

  describe("getEvent", () => {
    it("should return 400 for invalid ID", async () => {
      const mockReq = { params: { id: "invalid" } } as Partial<Request>;
      await controller.getEvent(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 404 if event not found", async () => {
      const mockReq = { params: { id: new Types.ObjectId().toString() } } as Partial<Request>;
      const populateMock3 = jest.fn().mockResolvedValue(null);
      const populateMock2 = jest.fn().mockReturnValue({ populate: populateMock3 });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (StripeEvent.findById as jest.Mock).mockReturnValue({ populate: populateMock1 });

      await controller.getEvent(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should return event details", async () => {
      const mockEvent = { _id: new Types.ObjectId(), type: "checkout.session.completed" };
      const mockReq = { params: { id: mockEvent._id.toString() } } as Partial<Request>;
      const populateMock3 = jest.fn().mockResolvedValue(mockEvent);
      const populateMock2 = jest.fn().mockReturnValue({ populate: populateMock3 });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (StripeEvent.findById as jest.Mock).mockReturnValue({ populate: populateMock1 });

      await controller.getEvent(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ event: mockEvent }),
      }));
    });
  });
});
