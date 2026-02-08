# Frontend Patterns

## Table of Contents
- [Modal Pattern](#modal-pattern)
- [Data Fetching](#data-fetching)
- [Form Handling](#form-handling)
- [Route Protection](#route-protection)
- [Toast Notifications](#toast-notifications)

---

## Modal Pattern

Use DaisyUI modal with controlled state:

```typescript
const [isOpen, setIsOpen] = useState(false);

<button onClick={() => setIsOpen(true)} className="btn btn-primary">
  Open Modal
</button>

{isOpen && (
  <div className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg">Title</h3>
      <p className="py-4">Content here</p>
      <div className="modal-action">
        <button onClick={() => setIsOpen(false)} className="btn">
          Close
        </button>
      </div>
    </div>
    <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
  </div>
)}
```

## Data Fetching

Use useEffect with cleanup:

```typescript
useEffect(() => {
  let mounted = true;
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get<MyData>('/endpoint');
      if (mounted) {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      if (mounted) {
        setError(err.message || 'Failed to load');
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };
  
  fetchData();
  return () => { mounted = false; };
}, [dependency]);
```

## Form Handling

With validation and error display:

```typescript
const {
  register,
  handleSubmit,
  reset,
  formState: { errors, isSubmitting }
} = useForm<FormData>();

const onSubmit = async (data: FormData) => {
  try {
    await apiClient.post('/endpoint', data);
    toast.success('Saved!');
    reset();
    onSuccess?.();
  } catch (err: any) {
    toast.error(err.message || 'Failed to save');
  }
};
```

## Route Protection

Admin routes use RequireAdmin wrapper:

```typescript
// In App.tsx routes
<Route path="/admin/*" element={
  <RequireAdmin>
    <AdminLayout />
  </RequireAdmin>
} />
```

## Toast Notifications

Use react-hot-toast:

```typescript
import toast from 'react-hot-toast';

toast.success('Operation successful');
toast.error('Something went wrong');
toast.loading('Processing...');
```

---

## Stripe Checkout Pattern (Phase 4)

Timer banner for checkout:

```typescript
interface CheckoutTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

const CheckoutTimer: React.FC<CheckoutTimerProps> = ({ expiresAt, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        onExpire();
      } else {
        setSecondsLeft(remaining);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  return (
    <div className={`alert ${secondsLeft < 60 ? 'alert-warning' : 'alert-info'}`}>
      <span>Complete checkout in {minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
};
```

---

*Add new patterns here as they're discovered*
