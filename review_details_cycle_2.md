## Code Review

This pull request introduces an advanced year filtering system for the Rankings page, including backend logic for parsing year ranges and a new frontend component for input. The changes are a good step forward, but there are several critical issues that need to be addressed. I've found a significant security risk with hardcoded credentials in `docker-compose.yml`, a broken React component in `YearRangeInput.tsx` due to incorrect hook usage, and a couple of bugs in `Rankings.tsx` related to data handling. Additionally, there are opportunities to improve code quality by removing magic numbers, updating tests to match new functionality, and improving test coverage.

<details>
<summary>I am having trouble creating individual review comments. Click here to see my feedback.</summary>

### docker-compose.yml (164-165)

![security-critical](https://www.gstatic.com/codereviewagent/security-critical.svg) ![critical](https://www.gstatic.com/codereviewagent/critical.svg)

Hardcoding default credentials, even for development, is a significant security risk. These credentials (`admin`/`keycloak123`) are weak and could be exploited if this configuration is ever used in a staging or production-like environment. It's recommended to remove the default values and rely solely on environment variables from a `.env` file, which should not be committed to version control. You can provide a `.env.example` file to guide developers on setting up their local environment.

```yaml
      KEYCLOAK_ADMIN_USER: ${KEYCLOAK_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
```

### src/frontend/src/components/YearRangeInput.tsx (9-71)

![critical](https://www.gstatic.com/codereviewagent/critical.svg)

This component has several structural issues that will cause it to fail at runtime:

1.  **Hooks in callbacks**: The `useEffect` hook for debouncing is called inside `handleChange`. React hooks can only be called at the top level of a component.
2.  **Duplicate function declaration**: `handleChange` is declared twice, once nested inside the other.
3.  **Incorrect return**: The component's JSX is being returned from within the `handleChange` handler, not from the component body itself.

These issues need to be fixed for the component to work as intended. The logic for debouncing should be moved to a top-level `useEffect` that watches for changes in the local input value.

```
const YearRangeInput: React.FC<YearRangeInputProps> = ({ value, onChange, availableRange }) => {
    const [localValue, setLocalValue] = useState(value);
    const [isValid, setIsValid] = useState(true);

    // Sync local state if parent updates (e.g. clear filters)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const validateInput = (input: string): boolean => {
        if (!input) return true; // Empty is valid (All Time)

        // Simple regex check for allowed characters
        if (!/^[\d\s,-]+$/.test(input)) return false;

        return true;
    };

    // Debounce the update to parent
    useEffect(() => {
        const timer = setTimeout(() => {
            const valid = validateInput(localValue);
            setIsValid(valid);
            if (valid && localValue !== value) {
                onChange(localValue);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    return (
        <div className="relative group">
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={`e.g. 2025, ${availableRange.min}-${availableRange.max}`}
                className={`bg-[#1c2230] text-white text-sm rounded-xl px-4 py-2 border 
                ${isValid ? 'border-white/10 focus:border-primary' : 'border-red-500 focus:border-red-500'} 
                focus:outline-none w-64 transition-all`}
            />
            <div className="absolute -bottom-5 left-0 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Available: {availableRange.min} - {availableRange.max}. Use comma or hyphen.
            </div>
        </div>
    );
};

export default YearRangeInput;
```

### src/frontend/src/pages/Rankings.tsx (44)

![critical](https://www.gstatic.com/codereviewagent/critical.svg)

This line appears to have been changed incorrectly. The `useApi` hook returns an object that contains the API response payload. Based on the backend controller, the rankings data is nested under a `data` property. The previous implementation `(response as any)?.data || []` was likely correct. This change will probably result in an empty rankings list or a runtime error when trying to map over the response object.

```suggestion
    const rankings = (response as any)?.data || [];
```

### src/frontend/src/pages/Rankings.tsx (18-21)

![high](https://www.gstatic.com/codereviewagent/high-priority.svg)

The `apiClient.getAvailableYears()` method returns an `ApiResponse` object, which has the shape `{ success: boolean, data: { min: number, max: number } }`. However, you are passing the entire `res` object to `setAvailableRange`, which expects an object of shape `{ min: number, max: number }`. This will cause a type mismatch and the `availableRange` state will be incorrect. You should pass `res.data` to the state setter.

```suggestion
                const res = await apiClient.getAvailableYears();
                if (res?.data) {
                    setAvailableRange(res.data);
                }
```

### src/frontend/src/pages/__tests__/Rankings.test.tsx (90-101)

![high](https://www.gstatic.com/codereviewagent/high-priority.svg)

This test case for updating the year filter is now outdated. It's attempting to find a `<select>` element (`combobox`), but the UI has been updated to use the new `<YearRangeInput />` component, which renders an `<input type="text">`. The test will likely fail and needs to be updated to query for the new input element and test its behavior.

```
    it('updates year filter', () => {
        setupMock();
        renderPage();

        const yearInput = screen.getByPlaceholderText(/e.g. 2025/i);
        expect(yearInput).toBeInTheDocument();

        fireEvent.change(yearInput, { target: { value: '2024' } });
        expect(yearInput).toHaveValue('2024');
    });
```

### src/backend/controllers/TournamentResultController.ts (714-745)

![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)

The `getAvailableYears` method can be simplified and made more maintainable. The magic number `2008` should be extracted into a named constant. Also, the logic for handling the 'no results' case is a bit redundant with the fallbacks used later. You can streamline this by defining defaults at the top and having a more direct data flow.

```typescript
  public getAvailableYears = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const DEFAULT_MIN_YEAR = 2008;
      const currentYear = new Date().getFullYear();

      const result = await Tournament.aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' }
          }
        }
      ]);

      if (result.length === 0 || !result[0].minDate) {
        this.sendSuccess(res, { min: DEFAULT_MIN_YEAR, max: currentYear });
        return;
      }

      const minYear = new Date(result[0].minDate).getFullYear();
      const maxYear = new Date(result[0].maxDate).getFullYear();

      this.sendSuccess(res, {
        min: isNaN(minYear) ? DEFAULT_MIN_YEAR : minYear,
        max: isNaN(maxYear) ? currentYear : maxYear
      });
    } catch (error) {
      next(error);
    }
  };
```

### src/backend/tests/unit/TournamentResultController.test.ts (11-76)

![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)

It's great that you've added tests for `getLeaderboard`. To improve test coverage for the new functionality, please also add a test suite for the new `getAvailableYears` method. This would involve testing the successful case with data, the case with no tournaments in the database, and error handling.

### src/backend/utils/sanitization.ts (23-61)

![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)

This function uses several magic numbers (`2000`, `2100`, `5`) for validation and optimization logic. To improve readability and maintainability, it's best to extract these into named constants at the top of the function.

```typescript
export const parseYearFilter = (input: string): { years: number[], ranges: { start: number, end: number }[] } => {
    const MIN_VALID_YEAR = 2000;
    const MAX_VALID_YEAR = 2100;
    const MAX_YEARS_TO_EXPLODE = 5;

    const sanitized = sanitizeString(input);
    if (!sanitized) return { years: [], ranges: [] };

    const parts = sanitized.split(',').map(p => p.trim());
    const years: Set<number> = new Set();
    const ranges: { start: number, end: number }[] = [];

    parts.forEach(part => {
        // Check for range (e.g., "2020-2022")
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-').map(s => s.trim());
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);

            if (!isNaN(start) && !isNaN(end) && start <= end && start >= MIN_VALID_YEAR && end <= MAX_VALID_YEAR) {
                // Optimization: For small ranges, just explode into years to keep query simple
                if (end - start <= MAX_YEARS_TO_EXPLODE) {
                    for (let y = start; y <= end; y++) {
                        years.add(y);
                    }
                } else {
                    ranges.push({ start, end });
                }
            }
        } else {
            // Single year
            const year = parseInt(part, 10);
            if (!isNaN(year) && year >= MIN_VALID_YEAR && year <= MAX_VALID_YEAR) {
                years.add(year);
            }
        }
    });

    return {
        years: Array.from(years).sort((a, b) => a - b),
        ranges
    };
};
```

### src/frontend/src/pages/Rankings.tsx (35)

![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)

The type for `getLeaderboard` in `api.ts` has been updated to accept a string for the `year` parameter. You can now remove the `as any` cast here for better type safety.

```suggestion
        }),
```

</details>
