import { renderHook, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSystemStatus } from "../useSystemStatus";
import React from "react";

// Mock api client
vi.mock("../../services/api", () => ({
  default: {
    getSystemStatus: vi.fn(),
  },
}));

import apiClient from "../../services/api";

const mockApiClient = apiClient as {
  getSystemStatus: ReturnType<typeof vi.fn>;
};

// Wrapper component that provides Router context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children} </BrowserRouter>
);

describe("useSystemStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial loading state", () => {
    mockApiClient.getSystemStatus.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.initialized).toBe(false);
  });

  it("should return initialized status on success", async () => {
    mockApiClient.getSystemStatus.mockResolvedValue({
      success: true,
      data: { initialized: true, hasSuperAdmin: true },
    });

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.initialized).toBe(true);
    expect(result.current.hasSuperAdmin).toBe(true);
  });

  it("should return not initialized when system is new", async () => {
    mockApiClient.getSystemStatus.mockResolvedValue({
      success: true,
      data: { initialized: false, hasSuperAdmin: false },
    });

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.initialized).toBe(false);
    expect(result.current.hasSuperAdmin).toBe(false);
  });

  it("should handle API errors gracefully", async () => {
    mockApiClient.getSystemStatus.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("should provide refresh function", async () => {
    mockApiClient.getSystemStatus
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
      expect(result.current.initialized).toBe(false);
    });

    // Trigger refresh
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });
  });
});
