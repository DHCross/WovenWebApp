import React from 'react';
import DebugAuthClient from './DebugAuthClient';

export default function DebugAuthPage() {
  // Server component wrapper to ensure client hydration happens inside DebugAuthClient
  return <DebugAuthClient />;
}
