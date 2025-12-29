import { renderHook, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSystemStatus } from "../useSystemStatus";
import React from "react";

// Mock api client
vi.mock("../../services/api", () => ({
  apiClient: {
    getSystemStatus: vi.fn(),
  },
}));

import { apiClient } from "../../services/api";

const mockGetSystemStatus = apiClient.getSystemStatus as ReturnType<
  typeof vi.fn
>;

// Wrapper component that provides Router context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("useSystemStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial loading state", () => {
    mockGetSystemStatus.mockReturnValue(new Promise(() => { })); // Never resolves

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(null);
  });

  it("should return initialized status on success", async () => {
    mockGetSystemStatus.mockResolvedValue({
      success: true,
      data: { initialized: true, hasSuperAdmin: true },
    });

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isInitialized).toBe(true);
  });

  it("should return not initialized when system is new", async () => {
    mockGetSystemStatus.mockResolvedValue({
      success: true,
      data: { initialized: false, hasSuperAdmin: false },
    });

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isInitialized).toBe(false);
  });

  it("should handle API errors gracefully", async () => {
    mockGetSystemStatus.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("should provide refresh function", async () => {
    mockGetSystemStatus
      .mockResolvedValueOnce({
        success: true,
        data: { initialized: false, hasSuperAdmin: false },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { initialized: true, hasSuperAdmin: true },
      });

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(false);
    });

    // Trigger refresh
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });
  });
});
