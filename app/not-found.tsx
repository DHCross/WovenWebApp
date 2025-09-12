import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-slate-500">The page you’re looking for doesn’t exist.</p>
      </div>
    </div>
  );
}
