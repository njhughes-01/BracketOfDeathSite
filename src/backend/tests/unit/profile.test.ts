import { Request, Response } from "express";
import ProfileController from "../../controllers/ProfileController";
import { Player } from "../../models/Player";
import keycloakAdminService from "../../services/keycloakAdminService";
import { RequestWithAuth } from "../../controllers/base";

// Mock dependencies
jest.mock("../../models/Player");
jest.mock("../../services/keycloakAdminService");

describe("ProfileController", () => {
  let req: Partial<RequestWithAuth>;
  let res: Partial<Response>;
  let json: any;
  let status: any;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    req = {
      body: {},
      params: {},
      user: {
        id: "user-123",
        email: "test@example.com",
        roles: ["user"],
      } as any,
    };
    res = {
      json,
      status,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return profile with player data when player exists", async () => {
      // Mock Keycloak user response
      const mockKcUser = {
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        realmRoles: ["user"],
        attributes: {
          playerId: ["player-123"],
        },
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);

      // Mock Player response
      const mockPlayer = {
        _id: "player-123",
        name: "Test User",
        gender: "male",
        bracketPreference: "mens",
      };
      (Player.findById as jest.Mock).mockResolvedValue(mockPlayer);

      await ProfileController.getProfile(req as any, res as Response, jest.fn());

      expect(keycloakAdminService.getUser).toHaveBeenCalledWith("user-123");
      expect(Player.findById).toHaveBeenCalledWith("player-123");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            id: "user-123",
            playerId: "player-123",
          }),
          player: mockPlayer,
          isComplete: true,
        },
      });
    });

    it("should return profile without player data when no player linked", async () => {
      // Mock Keycloak user response (no playerId)
      const mockKcUser = {
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        attributes: {},
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);

      await ProfileController.getProfile(req as any, res as Response, jest.fn());

      expect(keycloakAdminService.getUser).toHaveBeenCalledWith("user-123");
      expect(Player.findById).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            id: "user-123",
            playerId: undefined,
          }),
          player: null,
          isComplete: false,
        },
      });
    });

    it("should return isComplete: true for admin user regardless of player data", async () => {
      // Mock Keycloak user response with admin role in realmRoles
      const mockKcUser = {
        id: "user-admin",
        username: "adminuser",
        email: "admin@example.com",
        realmRoles: ["admin"],
        attributes: {},
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);

      // Even if req.user doesn't have the role (simulating stale token)
      req.user = { id: "user-admin", roles: ["user"], isAdmin: false } as any;

      await ProfileController.getProfile(req as any, res as Response, jest.fn());

      expect(keycloakAdminService.getUser).toHaveBeenCalledWith("user-admin");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          isComplete: true,
        }),
      });
    });

    it("should return isComplete: false for user 'admin' without superadmin/admin role", async () => {
      // Mock Keycloak user response WITHOUT admin role, but with username "admin"
      const mockKcUser = {
        id: "user-admin",
        username: "admin",
        email: "admin@example.com",
        realmRoles: ["user"], // Regular user role
        attributes: {},
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);

      req.user = { id: "user-admin", roles: ["user"], isAdmin: false } as any;

      await ProfileController.getProfile(req as any, res as Response, jest.fn());

      expect(keycloakAdminService.getUser).toHaveBeenCalledWith("user-admin");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({ username: "admin" }),
          isComplete: false, // Must be false now
        }),
      });
    });

    it("should return 401 if user is not authenticated", async () => {
      req.user = undefined;
      await ProfileController.getProfile(req as any, res as Response, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: "Unauthorized",
      });
    });
  });

  describe("updateProfile", () => {
    it("should create new player if none exists", async () => {
      req.body = {
        gender: "female",
        bracketPreference: "womens",
      };

      // Mock Keycloak user (no player)
      const mockKcUser = {
        id: "user-123",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        attributes: {},
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);

      // Mock Player creation
      const mockCreatedPlayer = {
        id: "new-player-123",
        name: "Test User",
        gender: "female",
        bracketPreference: "womens",
        isActive: true,
      };
      (Player.create as jest.Mock).mockResolvedValue(mockCreatedPlayer);

      await ProfileController.updateProfile(req as any, res as Response, jest.fn());

      expect(Player.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test User",
          gender: "female",
          bracketPreference: "womens",
        }),
      );
      expect(keycloakAdminService.updateUser).toHaveBeenCalledWith("user-123", {
        attributes: { playerId: ["new-player-123"] },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedPlayer,
        message: "Profile updated successfully",
      });
    });

    it("should update existing player if linked", async () => {
      req.body = {
        gender: "male",
        bracketPreference: "mixed",
      };

      // Mock Keycloak user (has player)
      const mockKcUser = {
        id: "user-123",
        attributes: { playerId: ["player-123"] },
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);

      // Mock Player update
      const mockUpdatedPlayer = {
        id: "player-123",
        gender: "male",
        bracketPreference: "mixed",
      };
      (Player.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedPlayer,
      );

      await ProfileController.updateProfile(req as any, res as Response, jest.fn());

      expect(Player.findByIdAndUpdate).toHaveBeenCalledWith(
        "player-123",
        { gender: "male", bracketPreference: "mixed" },
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedPlayer,
        message: "Profile updated successfully",
      });
    });

    it("should allow name-only updates without gender", async () => {
      req.body = { firstName: "John", lastName: "Doe" };
      
      // Mock Keycloak user
      const mockKcUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        attributes: {},
      };
      (keycloakAdminService.getUser as jest.Mock).mockResolvedValue(mockKcUser);
      (keycloakAdminService.updateUser as jest.Mock).mockResolvedValue(undefined);

      await ProfileController.updateProfile(req as any, res as Response, jest.fn());

      expect(keycloakAdminService.updateUser).toHaveBeenCalledWith("user-123", {
        firstName: "John",
        lastName: "Doe",
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          firstName: "John",
          lastName: "Doe",
          fullName: "John Doe",
        },
        message: "Profile updated successfully",
      });
    });
  });
});
