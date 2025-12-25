import React, { useState, useEffect, useCallback } from "react";
import type { ApiResponse, PaginatedResponse } from "../types/api";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  dependencies?: unknown[];
}

export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T> | PaginatedResponse<T>>,
  options: UseApiOptions = {},
) {
  const { immediate = true, onSuccess, onError, dependencies = [] } = options;

  const apiCallRef = React.useRef(apiCall);
  React.useEffect(() => {
    apiCallRef.current = apiCall;
  });

  const stableApiCall = React.useCallback(() => apiCallRef.current(), []);

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await stableApiCall();

      if (response.success) {
        // For paginated responses, return the entire response
        // For regular responses, return the data
        const data = "pagination" in response ? response : response.data;
        setState({
          data: data as T,
          loading: false,
          error: null,
        });
        onSuccess?.(data);
      } else {
        const error = response.error || "An error occurred";
        setState({
          data: null,
          loading: false,
          error,
        });
        onError?.(error);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({
        data: null,
        loading: false,
        error,
      });
      onError?.(error);
    }
  }, [stableApiCall, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export function usePaginatedApi<T>(
  apiCall: (page: number, filters?: any) => Promise<PaginatedResponse<T>>,
  options: UseApiOptions & { pageSize?: number } = {},
) {
  const { immediate = true, pageSize = 10, onSuccess, onError } = options;

  const [state, setState] = useState<{
    data: T[];
    loading: boolean;
    error: string | null;
    pagination: {
      current: number;
      pages: number;
      count: number;
      total: number;
    } | null;
  }>({
    data: [],
    loading: false,
    error: null,
    pagination: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<any>({});

  const execute = useCallback(
    async (page = currentPage, newFilters = filters) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiCall(page, {
          ...newFilters,
          limit: pageSize,
        });

        if (response.success) {
          setState({
            data: response.data || [],
            loading: false,
            error: null,
            pagination: response.pagination,
          });
          onSuccess?.(response.data);
        } else {
          const error = response.error || "An error occurred";
          setState((prev) => ({
            ...prev,
            loading: false,
            error,
          }));
          onError?.(error);
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
        }));
        onError?.(error);
      }
    },
    [currentPage, filters, pageSize],
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      execute(page, filters);
    },
    [execute, filters],
  );

  const updateFilters = useCallback(
    (newFilters: any) => {
      setFilters(newFilters);
      setCurrentPage(1);
      execute(1, newFilters);
    },
    [execute],
  );

  const refresh = useCallback(() => {
    execute(currentPage, filters);
  }, [execute, currentPage, filters]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      pagination: null,
    });
    setCurrentPage(1);
    setFilters({});
  }, []);

  return {
    ...state,
    currentPage,
    filters,
    execute,
    goToPage,
    updateFilters,
    refresh,
    reset,
  };
}

export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: {
    onSuccess?: (data: TData) => void;
    onError?: (error: string) => void;
  } = {},
) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<{
    data: TData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await mutationFn(variables);

      if (response.success) {
        setState({
          data: response.data || null,
          loading: false,
          error: null,
        });
        onSuccess?.(response.data!);
      } else {
        const error = response.error || "An error occurred";
        setState({
          data: null,
          loading: false,
          error,
        });
        onError?.(error);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({
        data: null,
        loading: false,
        error,
      });
      onError?.(error);
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}
