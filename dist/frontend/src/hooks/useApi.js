"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApi = useApi;
exports.usePaginatedApi = usePaginatedApi;
exports.useMutation = useMutation;
const react_1 = __importStar(require("react"));
function useApi(apiCall, options = {}) {
    const { immediate = true, onSuccess, onError, dependencies = [] } = options;
    const apiCallRef = react_1.default.useRef(apiCall);
    react_1.default.useEffect(() => {
        apiCallRef.current = apiCall;
    });
    const stableApiCall = react_1.default.useCallback(() => apiCallRef.current(), []);
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
    });
    const execute = (0, react_1.useCallback)(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await stableApiCall();
            if (response.success) {
                const data = 'pagination' in response ? response : response.data;
                setState({
                    data: data,
                    loading: false,
                    error: null,
                });
                onSuccess?.(data);
            }
            else {
                const error = response.error || 'An error occurred';
                setState({
                    data: null,
                    loading: false,
                    error,
                });
                onError?.(error);
            }
        }
        catch (err) {
            const error = err instanceof Error ? err.message : 'An unexpected error occurred';
            setState({
                data: null,
                loading: false,
                error,
            });
            onError?.(error);
        }
    }, [stableApiCall, onSuccess, onError]);
    (0, react_1.useEffect)(() => {
        if (immediate) {
            execute();
        }
    }, [immediate, execute, ...dependencies]);
    const reset = (0, react_1.useCallback)(() => {
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
function usePaginatedApi(apiCall, options = {}) {
    const { immediate = true, pageSize = 10, onSuccess, onError } = options;
    const [state, setState] = (0, react_1.useState)({
        data: [],
        loading: false,
        error: null,
        pagination: null,
    });
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const [filters, setFilters] = (0, react_1.useState)({});
    const execute = (0, react_1.useCallback)(async (page = currentPage, newFilters = filters) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await apiCall(page, { ...newFilters, limit: pageSize });
            if (response.success) {
                setState({
                    data: response.data || [],
                    loading: false,
                    error: null,
                    pagination: response.pagination,
                });
                onSuccess?.(response.data);
            }
            else {
                const error = response.error || 'An error occurred';
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error,
                }));
                onError?.(error);
            }
        }
        catch (err) {
            const error = err instanceof Error ? err.message : 'An unexpected error occurred';
            setState(prev => ({
                ...prev,
                loading: false,
                error,
            }));
            onError?.(error);
        }
    }, [currentPage, filters, pageSize]);
    (0, react_1.useEffect)(() => {
        if (immediate) {
            execute();
        }
    }, [immediate, execute]);
    const goToPage = (0, react_1.useCallback)((page) => {
        setCurrentPage(page);
        execute(page, filters);
    }, [execute, filters]);
    const updateFilters = (0, react_1.useCallback)((newFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
        execute(1, newFilters);
    }, [execute]);
    const refresh = (0, react_1.useCallback)(() => {
        execute(currentPage, filters);
    }, [execute, currentPage, filters]);
    const reset = (0, react_1.useCallback)(() => {
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
function useMutation(mutationFn, options = {}) {
    const { onSuccess, onError } = options;
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
    });
    const mutate = (0, react_1.useCallback)(async (variables) => {
        setState({ data: null, loading: true, error: null });
        try {
            const response = await mutationFn(variables);
            if (response.success) {
                setState({
                    data: response.data || null,
                    loading: false,
                    error: null,
                });
                onSuccess?.(response.data);
            }
            else {
                const error = response.error || 'An error occurred';
                setState({
                    data: null,
                    loading: false,
                    error,
                });
                onError?.(error);
            }
        }
        catch (err) {
            const error = err instanceof Error ? err.message : 'An unexpected error occurred';
            setState({
                data: null,
                loading: false,
                error,
            });
            onError?.(error);
        }
    }, []);
    const reset = (0, react_1.useCallback)(() => {
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
//# sourceMappingURL=useApi.js.map