import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePermissions } from "../usePermissions";
import { PERMISSIONS } from "../../types/user";

// Mock the AuthContext
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe("usePermissions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("with no user", () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: null,
                isAdmin: false,
            });
        });

        it("should return no permissions", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasPermission(PERMISSIONS.TOURNAMENT_CREATE)).toBe(false);
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.canCreateTournaments).toBe(false);
            expect(result.current.canManageUsers).toBe(false);
        });

        it("should return false for all permission checks", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasAnyPermission([
                PERMISSIONS.TOURNAMENT_CREATE,
                PERMISSIONS.PLAYER_CREATE
            ])).toBe(false);

            expect(result.current.hasAllPermissions([
                PERMISSIONS.TOURNAMENT_VIEW,
                PERMISSIONS.PLAYER_VIEW
            ])).toBe(false);
        });
    });

    describe("with admin user", () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: {
                    id: "admin-1",
                    username: "admin",
                    email: "admin@test.com",
                    roles: ["admin"],
                },
                isAdmin: true,
            });
        });

        it("should have all permissions", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.isAdmin).toBe(true);
            expect(result.current.canCreateTournaments).toBe(true);
            expect(result.current.canCreatePlayers).toBe(true);
            expect(result.current.canManageUsers).toBe(true);
            expect(result.current.canViewAdmin).toBe(true);
        });

        it("should pass hasAllPermissions check", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasAllPermissions([
                PERMISSIONS.TOURNAMENT_CREATE,
                PERMISSIONS.TOURNAMENT_DELETE,
                PERMISSIONS.USER_MANAGE_ROLES
            ])).toBe(true);
        });

        it("should pass hasAnyPermission check", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasAnyPermission([
                PERMISSIONS.SYSTEM_ADMIN
            ])).toBe(true);
        });
    });

    describe("with regular user", () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: {
                    id: "user-1",
                    username: "user",
                    email: "user@test.com",
                    roles: ["user"],
                },
                isAdmin: false,
            });
        });

        it("should have limited permissions", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.isAdmin).toBe(false);
            expect(result.current.canCreatePlayers).toBe(true); // Users can create players
            expect(result.current.canCreateTournaments).toBe(false);
            expect(result.current.canManageUsers).toBe(false);
        });

        it("should have view permissions", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasPermission(PERMISSIONS.TOURNAMENT_VIEW)).toBe(true);
            expect(result.current.hasPermission(PERMISSIONS.PLAYER_VIEW)).toBe(true);
        });

        it("should fail admin permission checks", () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasPermission(PERMISSIONS.TOURNAMENT_DELETE)).toBe(false);
            expect(result.current.hasPermission(PERMISSIONS.USER_MANAGE_ROLES)).toBe(false);
        });

        it("should handle hasAnyPermission correctly", () => {
            const { result } = renderHook(() => usePermissions());

            // User has VIEW but not DELETE
            expect(result.current.hasAnyPermission([
                PERMISSIONS.TOURNAMENT_VIEW,
                PERMISSIONS.TOURNAMENT_DELETE
            ])).toBe(true);

            // User has neither DELETE nor MANAGE
            expect(result.current.hasAnyPermission([
                PERMISSIONS.TOURNAMENT_DELETE,
                PERMISSIONS.USER_MANAGE_ROLES
            ])).toBe(false);
        });
    });
});
