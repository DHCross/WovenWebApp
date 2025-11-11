import { notFound } from 'next/navigation';
import TestEnvClient from './TestEnvClient';

export const dynamic = 'force-dynamic';

export default function TestEnvPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <TestEnvClient />;
}
