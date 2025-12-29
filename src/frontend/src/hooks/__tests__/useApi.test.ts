import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useApi, usePaginatedApi, useMutation } from "../useApi";

describe("useApi", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should start with initial state", () => {
        const mockApiCall = vi.fn().mockResolvedValue({ success: true, data: [] });

        const { result } = renderHook(() =>
            useApi(mockApiCall, { immediate: false })
        );

        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("should execute API call immediately when immediate is true", async () => {
        const mockData = { id: 1, name: "Test" };
        const mockApiCall = vi.fn().mockResolvedValue({ success: true, data: mockData });

        const { result } = renderHook(() =>
            useApi(mockApiCall, { immediate: true })
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(mockApiCall).toHaveBeenCalled();
        expect(result.current.data).toEqual(mockData);
    });

    it("should handle API errors", async () => {
        const mockApiCall = vi.fn().mockResolvedValue({
            success: false,
            error: "API Error"
        });

        const { result } = renderHook(() =>
            useApi(mockApiCall, { immediate: true })
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe("API Error");
        expect(result.current.data).toBeNull();
    });

    it("should handle network exceptions", async () => {
        const mockApiCall = vi.fn().mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() =>
            useApi(mockApiCall, { immediate: true })
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe("Network error");
    });

    it("should call onSuccess callback", async () => {
        const mockData = { id: 1 };
        const mockApiCall = vi.fn().mockResolvedValue({ success: true, data: mockData });
        const onSuccess = vi.fn();

        renderHook(() =>
            useApi(mockApiCall, { immediate: true, onSuccess })
        );

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith(mockData);
        });
    });

    it("should call onError callback", async () => {
        const mockApiCall = vi.fn().mockResolvedValue({
            success: false,
            error: "Failed"
        });
        const onError = vi.fn();

        renderHook(() =>
            useApi(mockApiCall, { immediate: true, onError })
        );

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith("Failed");
        });
    });

    it("should reset state", async () => {
        const mockApiCall = vi.fn().mockResolvedValue({ success: true, data: { id: 1 } });

        const { result } = renderHook(() =>
            useApi(mockApiCall, { immediate: true })
        );

        await waitFor(() => {
            expect(result.current.data).not.toBeNull();
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("should allow manual execution", async () => {
        const mockApiCall = vi.fn().mockResolvedValue({ success: true, data: { id: 1 } });

        const { result } = renderHook(() =>
            useApi(mockApiCall, { immediate: false })
        );

        expect(mockApiCall).not.toHaveBeenCalled();

        act(() => {
            result.current.execute();
        });

        await waitFor(() => {
            expect(mockApiCall).toHaveBeenCalled();
        });
    });
});

describe("useMutation", () => {
    it("should start with initial state", () => {
        const mockMutation = vi.fn();

        const { result } = renderHook(() => useMutation(mockMutation));

        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("should mutate successfully", async () => {
        const mockData = { id: 1, name: "Created" };
        const mockMutation = vi.fn().mockResolvedValue({ success: true, data: mockData });

        const { result } = renderHook(() => useMutation(mockMutation));

        act(() => {
            result.current.mutate({ name: "Test" });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.data).toEqual(mockData);
    });

    it("should handle mutation errors", async () => {
        const mockMutation = vi.fn().mockResolvedValue({
            success: false,
            error: "Mutation failed"
        });

        const { result } = renderHook(() => useMutation(mockMutation));

        act(() => {
            result.current.mutate({});
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe("Mutation failed");
    });
});

describe("usePaginatedApi", () => {
    it("should handle paginated responses", async () => {
        const mockData = [{ id: 1 }, { id: 2 }];
        const mockApiCall = vi.fn().mockResolvedValue({
            success: true,
            data: mockData,
            pagination: { current: 1, pages: 5, count: 2, total: 50 }
        });

        const { result } = renderHook(() =>
            usePaginatedApi(mockApiCall, { immediate: true })
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.data).toEqual(mockData);
        expect(result.current.pagination).toEqual({
            current: 1, pages: 5, count: 2, total: 50
        });
    });

    it("should go to specific page", async () => {
        const mockApiCall = vi.fn().mockResolvedValue({
            success: true,
            data: [],
            pagination: { current: 1, pages: 5, count: 0, total: 50 }
        });

        const { result } = renderHook(() =>
            usePaginatedApi(mockApiCall, { immediate: false })
        );

        act(() => {
            result.current.goToPage(3);
        });

        await waitFor(() => {
            expect(mockApiCall).toHaveBeenCalledWith(3, expect.any(Object));
        });
    });
});
