export const dynamic = 'force-dynamic';
import HomeHero from "../components/HomeHero";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Woven Web App</h1>
        <p className="mt-3 text-slate-500">FIELD → MAP → VOICE. Start with the geometry (Math Brain), then Chat.</p>
      </header>

      <HomeHero />

      <p className="mt-8 text-center text-xs text-slate-500">
        You can still access the previous static site at{' '}
        <a className="underline hover:text-slate-300" href="/legacy/index.html">Legacy Landing</a>.
      </p>
    </main>
  );
}
