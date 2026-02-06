# Testing Patterns

## Table of Contents
- [Async Testing](#async-testing)
- [Form Testing](#form-testing)
- [Modal Testing](#modal-testing)
- [Error Boundary Testing](#error-boundary-testing)
- [API Error Testing](#api-error-testing)

---

## Async Testing

Wait for async operations:

```typescript
import { waitFor, screen } from '@testing-library/react';

it('loads data asynchronously', async () => {
  render(<MyComponent />);
  
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  
  // Now check for data
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

## Form Testing

Test form submission:

```typescript
import { fireEvent, waitFor } from '@testing-library/react';

it('submits form data', async () => {
  const onSubmitMock = vi.fn();
  render(<MyForm onSubmit={onSubmitMock} />);
  
  // Fill form
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Test Name' },
  });
  
  // Submit
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  await waitFor(() => {
    expect(onSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Name' })
    );
  });
});
```

## Modal Testing

Test modal open/close:

```typescript
it('opens and closes modal', async () => {
  render(<ComponentWithModal />);
  
  // Modal should be closed initially
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  
  // Open modal
  fireEvent.click(screen.getByText('Open Modal'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  
  // Close modal
  fireEvent.click(screen.getByText('Close'));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

## Error Boundary Testing

```typescript
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

it('catches errors and shows fallback', () => {
  // Suppress console.error for this test
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  
  consoleSpy.mockRestore();
});
```

## API Error Testing

```typescript
it('handles API errors gracefully', async () => {
  (apiClient.get as any).mockRejectedValue(new Error('Network error'));
  
  render(<MyComponent />);
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

---

## Backend: Database Mocking

```typescript
// Mock entire model
jest.mock('../models/MyModel', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

// Setup mock returns
beforeEach(() => {
  (MyModel.find as jest.Mock).mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockData]),
      }),
    }),
  });
});
```

---

*Add new patterns here as they're discovered*
