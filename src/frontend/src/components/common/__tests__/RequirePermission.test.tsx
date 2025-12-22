import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RequirePermission from '../RequirePermission';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../types/user';

// Mock the usePermissions hook
vi.mock('../../../hooks/usePermissions');

describe('RequirePermission Component', () => {
  const mockHasPermission = vi.fn();
  const mockHasAnyPermission = vi.fn();
  const mockHasAllPermissions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePermissions as any).mockReturnValue({
      hasPermission: mockHasPermission,
      hasAnyPermission: mockHasAnyPermission,
      hasAllPermissions: mockHasAllPermissions,
      isAdmin: false,
    });
  });

  it('renders children when single permission is met', () => {
    mockHasPermission.mockReturnValue(true);

    render(
      <RequirePermission permission={PERMISSIONS.PLAYER_CREATE}>
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockHasPermission).toHaveBeenCalledWith(PERMISSIONS.PLAYER_CREATE);
  });

  it('renders fallback when single permission is missing', () => {
    mockHasPermission.mockReturnValue(false);

    render(
      <RequirePermission 
        permission={PERMISSIONS.PLAYER_CREATE}
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders children when anyPermission condition is met', () => {
    mockHasAnyPermission.mockReturnValue(true);

    render(
      <RequirePermission anyPermission={[PERMISSIONS.PLAYER_CREATE, PERMISSIONS.PLAYER_EDIT]}>
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockHasAnyPermission).toHaveBeenCalledWith([PERMISSIONS.PLAYER_CREATE, PERMISSIONS.PLAYER_EDIT]);
  });

  it('renders children when allPermissions condition is met', () => {
    mockHasAllPermissions.mockReturnValue(true);

    render(
      <RequirePermission allPermissions={[PERMISSIONS.PLAYER_CREATE, PERMISSIONS.PLAYER_EDIT]}>
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockHasAllPermissions).toHaveBeenCalledWith([PERMISSIONS.PLAYER_CREATE, PERMISSIONS.PLAYER_EDIT]);
  });

  it('renders fallback when anyPermission condition is not met', () => {
    mockHasAnyPermission.mockReturnValue(false);

    render(
      <RequirePermission 
        anyPermission={[PERMISSIONS.PLAYER_CREATE, PERMISSIONS.PLAYER_EDIT]}
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders fallback when allPermissions condition is not met', () => {
    mockHasAllPermissions.mockReturnValue(false);

    render(
      <RequirePermission 
        allPermissions={[PERMISSIONS.PLAYER_CREATE, PERMISSIONS.PLAYER_EDIT]}
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders children only when multiple permission props are all met', () => {
    mockHasPermission.mockReturnValue(true);
    mockHasAllPermissions.mockReturnValue(true);

    render(
      <RequirePermission 
        permission={PERMISSIONS.PLAYER_CREATE}
        allPermissions={[PERMISSIONS.PLAYER_EDIT]}
      >
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders fallback when one of multiple permission props is not met', () => {
    mockHasPermission.mockReturnValue(true);
    mockHasAllPermissions.mockReturnValue(false);

    render(
      <RequirePermission 
        permission={PERMISSIONS.PLAYER_CREATE}
        allPermissions={[PERMISSIONS.PLAYER_EDIT]}
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
