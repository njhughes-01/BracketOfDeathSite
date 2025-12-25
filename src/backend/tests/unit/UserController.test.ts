import { Request, Response } from "express";
import UserController from "../../controllers/UserController";
import keycloakAdminService from "../../services/keycloakAdminService";
import jwt from "jsonwebtoken";

// Mock dependencies with factory
jest.mock("../../services/keycloakAdminService", () => ({
  __esModule: true,
  default: {
    createUser: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    resetUserPassword: jest.fn(),
    setUserRoles: jest.fn(),
    assignRolesToUser: jest.fn(),
    removeRolesFromUser: jest.fn(),
    getAvailableRoles: jest.fn(),
    clearUserRequiredActions: jest.fn(),
    executeActionsEmail: jest.fn(),
    getUsers: jest.fn(),
  },
}));

jest.mock("../../services/MailjetService");
jest.mock("jsonwebtoken", () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

// Mock axios
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    // Keep create just in case, but if service is mocked, it shouldn't be called
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      post: jest.fn(),
      get: jest.fn(),
    })),
  },
}));

// Mock Player model
jest.mock("../../models/Player", () => ({
  Player: {
    findByIdAndDelete: jest.fn(),
  },
}));
import { Player } from "../../models/Player";

import axios from "axios";

describe("UserController", () => {
  let userController: UserController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    userController = new UserController();
    jsonMock = jest.fn();
    const sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    };
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should return token on successful login", async () => {
      mockReq = {
        body: { username: "testuser", password: "password123" },
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          access_token: "fake-token",
          refresh_token: "fake-refresh-token",
          expires_in: 300,
        },
      });

      await userController.login(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        token: "fake-token",
        refreshToken: "fake-refresh-token",
        expiresIn: 300,
      });
    });

    it("should return 400 if username/password missing", async () => {
      mockReq = { body: {} };
      await userController.login(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 401 on invalid credentials", async () => {
      mockReq = {
        body: { username: "testuser", password: "wrongpassword" },
      };

      (axios.post as jest.Mock).mockRejectedValue({
        response: { data: { error: "invalid_grant" } },
      });

      await userController.login(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe("register", () => {
    const validUser = {
      username: "newuser",
      email: "new@example.com",
      password: "password123",
      firstName: "New",
      lastName: "User",
    };

    it("should create user successfully", async () => {
      mockReq = { body: { userData: validUser } };

      (keycloakAdminService.createUser as jest.Mock).mockResolvedValue({
        id: "user-id",
        username: "newuser",
        email: "new@example.com",
        enabled: true,
        emailVerified: false,
      });

      await userController.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ username: "newuser" }),
        }),
      );
    });

    it("should fail with missing fields", async () => {
      mockReq = { body: { userData: { username: "user" } } }; // Missing email/pass
      await userController.register(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Missing required fields"),
        }),
      );
    });

    it("should fail if user already exists (409)", async () => {
      mockReq = { body: { userData: validUser } };

      (keycloakAdminService.createUser as jest.Mock).mockRejectedValue({
        response: { status: 409 },
      });

      await userController.register(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(409);
    });
  });
  describe("linkPlayerToSelf", () => {
    it("should link player successfully", async () => {
      mockReq = {
        user: { id: "user-1" },
        body: { playerId: "player-1" },
      } as any;

      const mockUser = {
        id: "user-1",
        username: "user1",
        email: "u1@example.com",
        attributes: { playerId: ["player-1"] },
      };

      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockUser);

      await userController.linkPlayerToSelf(
        mockReq as Request,
        mockRes as Response,
      );

      expect(keycloakAdminService.updateUser).toHaveBeenCalledWith("user-1", {
        attributes: { playerId: ["player-1"] },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ playerId: "player-1" }),
        }),
      );
    });

    it("should fail if not authenticated", async () => {
      mockReq = { user: undefined, body: { playerId: "p1" } } as any;
      await userController.linkPlayerToSelf(
        mockReq as Request,
        mockRes as Response,
      );
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      mockReq = {
        params: { id: "user-1" },
        body: { newPassword: "password123", temporary: false },
      };

      await userController.resetPassword(
        mockReq as Request,
        mockRes as Response,
      );

      expect(keycloakAdminService.resetUserPassword).toHaveBeenCalledWith(
        "user-1",
        "password123",
        false,
      );
      expect(
        keycloakAdminService.clearUserRequiredActions,
      ).toHaveBeenCalledWith("user-1");
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("should fail with weak password", async () => {
      mockReq = {
        params: { id: "user-1" },
        body: { newPassword: "short" },
      };
      await userController.resetPassword(
        mockReq as Request,
        mockRes as Response,
      );
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("deleteUser", () => {
    it("should delete user and linked player successfully", async () => {
      mockReq = {
        params: { id: "user-1" },
      };

      // Mock getUser to return player link
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue({
        id: "user-1",
        attributes: { playerId: ["player-123"] },
      });

      await userController.deleteUser(mockReq as Request, mockRes as Response);

      expect(keycloakAdminService.deleteUser).toHaveBeenCalledWith("user-1");
      expect(Player.findByIdAndDelete).toHaveBeenCalledWith("player-123");
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User deleted successfully",
        }),
      );
    });

    it("should delete user even if no linked player", async () => {
      mockReq = {
        params: { id: "user-1" },
      };

      // Mock getUser to return NO player link
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue({
        id: "user-1",
        attributes: {},
      });

      await userController.deleteUser(mockReq as Request, mockRes as Response);

      expect(keycloakAdminService.deleteUser).toHaveBeenCalledWith("user-1");
      expect(Player.findByIdAndDelete).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User deleted successfully",
        }),
      );
    });
  });
});
