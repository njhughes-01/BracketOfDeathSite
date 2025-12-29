import { KeycloakAdminService } from "../../../../src/backend/services/keycloakAdminService";

describe("KeycloakAdminService", () => {
    let service: KeycloakAdminService;
    let mockClient: any;

    beforeEach(() => {
        // Explicitly set env vars
        process.env.KEYCLOAK_URL = "http://keycloak:8080";
        process.env.KEYCLOAK_REALM = "bod";
        process.env.KEYCLOAK_ADMIN_USER = "admin";
        process.env.KEYCLOAK_ADMIN_PASSWORD = "password";

        // Create a mock client with all necessary methods
        mockClient = {
            post: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            request: jest.fn(),
            create: jest.fn().mockReturnThis(),
        };

        // Default mock for token acquisition
        mockClient.post.mockResolvedValue({
            data: {
                access_token: "mock-token",
                expires_in: 300,
            },
        });

        // Instantiate service with the mock client
        service = new KeycloakAdminService(mockClient);
    });

    describe("getAdminToken", () => {
        it("should fetch a new token if none exists", async () => {
            // Access private method for testing logic flow via any cast
            const token = await (service as any).getAdminToken();

            expect(token).toBe("mock-token");
            expect(mockClient.post).toHaveBeenCalledWith(
                expect.stringContaining("/token"),
                expect.any(URLSearchParams),
                expect.any(Object)
            );
        });

        it("should use cached token if valid", async () => {
            (service as any).adminToken = "cached-token";
            (service as any).tokenExpiry = Date.now() + 1000000; // Far in the future
            mockClient.post.mockClear();

            const token = await (service as any).getAdminToken();

            expect(token).toBe("cached-token");
            expect(mockClient.post).not.toHaveBeenCalled();
        });
    });

    describe("createUser", () => {
        it("should create a user and return it", async () => {
            // Mock chained responses for the flow:
            // 1. Create User (POST /users) -> returns headers with location
            // 2. Get User (GET /users/{id}) -> returns user details
            // 3. Get Realm Roles (GET /users/{id}/role-mappings/realm) -> returns []
            // 4. Clear Actions (PUT /users/{id}) -> returns {}

            mockClient.request
                .mockResolvedValueOnce({
                    headers: { location: "http://keycloak/users/user-123" }
                })
                .mockResolvedValueOnce({ data: { id: "user-123", username: "testuser", email: "test@example.com", enabled: true } })
                .mockResolvedValueOnce({ data: [] })
                .mockResolvedValueOnce({ data: {} });

            const userData = {
                username: "testuser",
                email: "test@example.com",
                password: "Password123",
            };

            const user = await service.createUser(userData);

            expect(user.id).toBe("user-123");
            expect(user.username).toBe("testuser");
            expect(mockClient.request).toHaveBeenCalledTimes(4);
        });
    });

    describe("getUsers", () => {
        it("should fetch users with search param", async () => {
            const mockUsers = [{ id: "1", username: "user1" }, { id: "2", username: "user2" }];
            mockClient.request.mockResolvedValueOnce({ data: mockUsers });

            const users = await service.getUsers("test", 10);

            expect(users).toHaveLength(2);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                url: expect.stringContaining("search=test"),
                method: "GET"
            }));
        });
    });

    describe("deleteUser", () => {
        it("should call DELETE endpoint", async () => {
            mockClient.request.mockResolvedValueOnce({ data: {} });

            await service.deleteUser("user-123");

            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                url: "/users/user-123",
                method: "DELETE"
            }));
        });
    });
});
