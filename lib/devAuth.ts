import React from 'react';

// Development authentication bypass
// This file is only used in development mode

const isDev = process.env.NODE_ENV === 'development' || 
  process.env.NEXT_PUBLIC_DEV_MODE === 'true';

const useLocalAuth = isDev && 
  process.env.NEXT_PUBLIC_USE_LOCAL_AUTH === 'true';

/**
 * Returns whether authentication is enabled
 */
export const isAuthEnabled = !useLocalAuth;

/**
 * Gets a mock user object for development
 */
export const getMockUser = (): { name: string; email: string } | null => {
  if (!useLocalAuth) return null;
  
  try {
    const mockUser = process.env.NEXT_PUBLIC_MOCK_USER;
    if (!mockUser) {
      return { name: 'Local Dev User', email: 'dev@local' };
    }
    return JSON.parse(mockUser);
  } catch (e) {
    console.warn('Failed to parse mock user, using default');
    return { name: 'Local Dev User', email: 'dev@local' };
  }
};

type AnyProps = {
  [key: string]: any;
};

/**
 * Higher-order component that bypasses authentication in development
 */
export function withDevAuth<P extends AnyProps>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  if (!useLocalAuth) {
    return WrappedComponent;
  }

  const displayName = 
    WrappedComponent.displayName || 
    WrappedComponent.name || 
    'Component';

  const DevWrapper: React.FC<P> = (props) => {
    return React.createElement(WrappedComponent, props);
  };

  DevWrapper.displayName = `withDevAuth(${displayName})`;
  return DevWrapper;
}
