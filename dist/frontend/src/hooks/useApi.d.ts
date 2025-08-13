import type { ApiResponse, PaginatedResponse } from '../types/api';
interface UseApiOptions {
    immediate?: boolean;
    onSuccess?: (data: unknown) => void;
    onError?: (error: string) => void;
    dependencies?: unknown[];
}
export declare function useApi<T>(apiCall: () => Promise<ApiResponse<T> | PaginatedResponse<T>>, options?: UseApiOptions): {
    execute: () => Promise<void>;
    reset: () => void;
    data: T | null;
    loading: boolean;
    error: string | null;
};
export declare function usePaginatedApi<T>(apiCall: (page: number, filters?: any) => Promise<PaginatedResponse<T>>, options?: UseApiOptions & {
    pageSize?: number;
}): {
    currentPage: number;
    filters: any;
    execute: (page?: number, newFilters?: any) => Promise<void>;
    goToPage: (page: number) => void;
    updateFilters: (newFilters: any) => void;
    refresh: () => void;
    reset: () => void;
    data: T[];
    loading: boolean;
    error: string | null;
    pagination: {
        current: number;
        pages: number;
        count: number;
        total: number;
    } | null;
};
export declare function useMutation<TData, TVariables = void>(mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>, options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: string) => void;
}): {
    mutate: (variables: TVariables) => Promise<void>;
    reset: () => void;
    data: TData | null;
    loading: boolean;
    error: string | null;
};
export {};
//# sourceMappingURL=useApi.d.ts.map