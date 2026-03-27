# Component System Refactor - Mobile-First UI Library

## Problem
Mobile responsive fixes were applied ad-hoc across 7+ files with inline Tailwind classes. This creates:
- **Duplication**: Same patterns (`flex-col sm:flex-row`, `min-h-[44px]`) repeated everywhere
- **Inconsistency**: Different implementations of similar patterns
- **Maintenance burden**: Changes require updating multiple files
- **No type safety**: Raw className strings, easy to make mistakes

## Solution: Organized Component System

### 1. Responsive Layout Components

#### `<Stack>` - Replaces manual flex-col/flex-row
```tsx
// components/ui/Stack.tsx
interface StackProps {
  direction?: 'horizontal' | 'vertical' | 'responsive';
  gap?: 1 | 2 | 3 | 4 | 6 | 8;
  align?: 'start' | 'center' | 'end' | 'stretch';
  children: React.ReactNode;
  className?: string;
}

// Usage:
<Stack direction="responsive" gap={3}>
  <Button>Primary</Button>
  <Button variant="secondary">Cancel</Button>
</Stack>

// Generates: flex flex-col sm:flex-row gap-3
```

#### `<ResponsiveGrid>` - Grid layouts that adapt
```tsx
<ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
  <Card />
  <Card />
  <Card />
</ResponsiveGrid>
```

#### `<Container>` - Consistent padding/spacing
```tsx
interface ContainerProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Auto applies: px-4 sm:px-6 md:px-8 based on size
```

### 2. Button Components

#### `<Button>` - Base button with mobile touch targets
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean; // Auto w-full on mobile, w-auto on desktop
  icon?: string; // Material icon name
  loading?: boolean;
  disabled?: boolean;
}

// Always enforces min-h-[44px] min-w-[44px]
```

#### `<ButtonGroup>` - Button groups that stack responsively
```tsx
interface ButtonGroupProps {
  orientation?: 'horizontal' | 'vertical' | 'responsive';
  align?: 'start' | 'end' | 'center' | 'stretch';
  reversed?: boolean; // For mobile-first primary button positioning
}

<ButtonGroup orientation="responsive" reversed>
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
</ButtonGroup>

// Mobile: flex-col-reverse (primary on top)
// Desktop: flex-row (normal order)
```

### 3. Modal Components

#### Refactor existing `Modal.tsx`
- Add `mobileSheet` prop for bottom-sheet behavior on mobile
- Add responsive sizing defaults
- Ensure max-h-[90vh] overflow-y-auto always applied

```tsx
<Modal 
  mobileSheet={true}  // Slides from bottom on mobile
  size="responsive"   // sm on mobile, md on tablet, lg on desktop
>
  <ModalHeader>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <ButtonGroup>...</ButtonGroup>
  </ModalFooter>
</Modal>
```

### 4. Form Components

#### `<FormField>` - Label + input wrapper
```tsx
<FormField label="Email" required>
  <Input type="email" fullWidth />
</FormField>

// Auto: full-width mobile, responsive sizing
```

#### `<Input>`, `<Select>`, `<Textarea>` - Form controls
- All enforce 44px min-height
- Full-width mobile by default
- Consistent focus states

### 5. Table Components

#### `<ResponsiveTable>` - Table that becomes cards on mobile
```tsx
<ResponsiveTable
  data={users}
  columns={[
    { key: 'name', label: 'Name', mobileLabel: 'User' },
    { key: 'email', label: 'Email', hideOnMobile: true },
    { key: 'status', label: 'Status' }
  ]}
  renderMobileCard={(row) => <UserCard user={row} />}
  renderActions={(row) => <ButtonGroup>...</ButtonGroup>}
/>

// Desktop: <table>
// Mobile: <div> with card layout
```

### 6. Typography Components

#### `<Heading>`, `<Text>` - Responsive text
```tsx
<Heading level={1} responsive>Title</Heading>
// text-2xl sm:text-3xl md:text-4xl

<Text size="sm" responsive>Body text</Text>
// text-sm sm:text-base
```

## Implementation Plan

### Phase 1: Core Components (Priority)
1. ✅ `Stack.tsx` - Layout primitive
2. ✅ `Button.tsx` - Touch-optimized buttons
3. ✅ `ButtonGroup.tsx` - Responsive button groups
4. ✅ `Container.tsx` - Spacing/padding
5. ✅ Refactor `Modal.tsx` - Add mobile sheet behavior

### Phase 2: Form & Input
6. ✅ `Input.tsx`, `Select.tsx`, `Textarea.tsx`
7. ✅ `FormField.tsx` - Wrapper component

### Phase 3: Data Display
8. ✅ `ResponsiveTable.tsx` - Table → Card transform
9. ✅ `ResponsiveGrid.tsx` - Grid layouts
10. ✅ `Heading.tsx`, `Text.tsx` - Typography

### Phase 4: Migration
11. ✅ Refactor UserManagement to use new components
12. ✅ Refactor UserDetailModal
13. ✅ Refactor Admin pages (Settings, DiscountCodes, Stripe)
14. ⏳ Document component API
15. ⏳ Add Storybook examples

## Benefits

### Developer Experience
- **Type-safe**: Props enforce valid combinations
- **Less code**: `<Stack direction="responsive">` vs manual Tailwind
- **Autocomplete**: IDE suggests valid prop values
- **Consistent**: Same pattern everywhere

### Maintainability
- **Single source of truth**: Change button height once, applies everywhere
- **Easy updates**: Adjust breakpoints in one place
- **Testing**: Test components once, not every page
- **Documentation**: Reusable components are self-documenting

### Performance
- **Tree-shakeable**: Only import what you use
- **No duplication**: Shared CSS classes
- **Lazy loading**: Can code-split UI library

## File Structure

```
src/frontend/src/components/ui/
├── layout/
│   ├── Stack.tsx
│   ├── Container.tsx
│   ├── ResponsiveGrid.tsx
│   └── index.ts
├── buttons/
│   ├── Button.tsx
│   ├── ButtonGroup.tsx
│   └── index.ts
├── forms/
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Textarea.tsx
│   ├── FormField.tsx
│   └── index.ts
├── data/
│   ├── ResponsiveTable.tsx
│   └── index.ts
├── typography/
│   ├── Heading.tsx
│   ├── Text.tsx
│   └── index.ts
├── modals/
│   ├── Modal.tsx
│   ├── ModalHeader.tsx
│   ├── ModalBody.tsx
│   ├── ModalFooter.tsx
│   └── index.ts
└── index.ts (exports all)
```

## Success Criteria

✅ All mobile responsive patterns extracted to reusable components
✅ Zero inline `flex-col sm:flex-row` in page files
✅ All touch targets automatically 44px minimum
✅ Tables automatically responsive (card view on mobile)
✅ Buttons automatically stack on mobile
✅ Type-safe component API with IntelliSense
✅ Reduced LOC in page components by 30%+
✅ Consistent mobile UX across entire app

## Migration Example

### Before (Manual Tailwind)
```tsx
<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-4 sm:px-6">
  <h2 className="text-2xl sm:text-3xl font-bold text-white">User Management</h2>
  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
    <button className="flex-1 sm:flex-none min-h-[44px] bg-blue-500...">
      Create User
    </button>
    <button className="flex-1 sm:flex-none min-h-[44px] bg-green-500...">
      Invite
    </button>
  </div>
</div>
```

### After (Component System)
```tsx
<Container padding="md">
  <Stack direction="responsive" align="center" justify="between">
    <Heading level={2} responsive>User Management</Heading>
    <ButtonGroup orientation="responsive">
      <Button variant="primary" icon="person_add">Create User</Button>
      <Button variant="success" icon="mail">Invite</Button>
    </ButtonGroup>
  </Stack>
</Container>
```

**Cleaner, type-safe, maintainable** ✨
