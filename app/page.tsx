export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-6 py-16 text-center">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Woven Web App – Migration in progress</h1>
        <p className="mt-3 text-slate-500">We're migrating the legacy static site into a modern Next.js App Router experience.</p>
        <div className="mt-6 inline-flex gap-3">
          <a href="/chat" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">Open Chat</a>
          <a href="/legacy/index.html" className="rounded-md bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700">Legacy Landing</a>
        </div>
        <p className="mt-8 text-xs text-slate-500">This is a temporary page during the migration. Math Brain port is coming soon.</p>
      </div>
    </main>
  );
}
