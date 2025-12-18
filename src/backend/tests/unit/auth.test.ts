import request from "supertest";
import express from "express";
import authRoutes from "../../routes/auth";
import keycloakAdminService from "../../services/keycloakAdminService";

// Mock KeycloakAdminService
jest.mock("../../services/keycloakAdminService", () => ({
  __esModule: true,
  default: {
    createUser: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /auth/register", () => {
    const validUserData = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    };

    it("should register a new user successfully", async () => {
      (keycloakAdminService.createUser as jest.Mock).mockResolvedValue({
        id: "user-id-123",
        username: validUserData.username,
        email: validUserData.email,
      });

      const response = await request(app)
        .post("/auth/register")
        .send({ userData: validUserData });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(validUserData.username);
      expect(keycloakAdminService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: validUserData.username,
          email: validUserData.email,
          roles: ["user"],
        }),
      );
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ userData: { username: "testuser" } }); // Missing email/pass

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should return 400 for short password", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ userData: { ...validUserData, password: "short" } });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Password must be at least");
    });

    it("should return 409 if user already exists", async () => {
      (keycloakAdminService.createUser as jest.Mock).mockRejectedValue({
        response: { status: 409 },
      });

      const response = await request(app)
        .post("/auth/register")
        .send({ userData: validUserData });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("already exists");
    });
  });
});
