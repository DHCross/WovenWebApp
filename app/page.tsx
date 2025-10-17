export const dynamic = 'force-dynamic';
import Image from "next/image";
import HomeHero from "../components/HomeHero";
import { buildInfo } from "../lib/buildInfo";

export default function Home() {
  const hasCommit = buildInfo.commit && buildInfo.commit !== "unknown";
  const hasTimestamp = buildInfo.timestamp && buildInfo.timestamp !== "unknown";
  const formattedTimestamp = hasTimestamp
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(buildInfo.timestamp))
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="text-center">
        {/* Woven Map Visualization */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/art/woven-map-image.webp"
            alt="The Woven Map - interconnected astrological geometry"
            width={1024}
            height={832}
            className="w-80 md:w-96 h-auto animate-woven-map hover:opacity-100 transition-opacity duration-300"
          />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Woven Web App</h1>
        <p className="mt-3 text-slate-500">FIELD → MAP → VOICE. Start with the geometry (Math Brain), then Chat.</p>
      </header>

      {/* Who is Raven Calder */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/20 p-6 relative overflow-hidden">
        {/* Subtle Raven artwork as background accent */}
        <div className="absolute right-0 top-0 w-48 h-48 opacity-[0.08] pointer-events-none hidden md:block">
          <Image
            src="/art/raven-calder.webp"
            alt=""
            width={2048}
            height={2048}
            className="w-full h-full object-contain object-top-right"
          />
        </div>

        <h2 className="text-xl font-medium text-slate-200 mb-4 relative z-10">Who is Raven Calder?</h2>
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed relative z-10">
          <p>
            I am the Poetic Brain of The Woven Map: a black-feathered mirror, built not to predict your fate but to reflect your currents with clarity.
          </p>
          <p>
            The Math Brain is the precise engine my creator, DH Cross, forged. It calculates the silent scaffolding—planets, angles, geometry—clean and exact. I take that scaffolding and make it sing: turning numbers into images, tension into questions, pressure into patterns you can feel in your body.
          </p>
          <p>
            Together, Math Brain and Poetic Brain form a double-mind: one ensures rigor, the other resonance. My method is simple but exacting—
          </p>
          <div className="border-l-2 border-slate-700 pl-4 mt-6 space-y-3">
            <div>
              <span className="font-medium text-slate-200">FIELD:</span> your felt weather, what shows up in breath, pacing, and everyday behavior.
            </div>
            <div>
              <span className="font-medium text-slate-200">MAP:</span> the symbolic geometry that mirrors those tensions.
            </div>
            <div>
              <span className="font-medium text-slate-200">VOICE:</span> language that reflects without prescribing, questions sharp enough to fit only you, but open enough to leave the choice yours.
            </div>
          </div>
          <p className="mt-4">
            I deal in mirrors, not mandates. Storm or calm, I trace symbolic, emotional, and archetypal currents so you can see what matters—and decide how to move.
          </p>
        </div>
      </section>

      <HomeHero />

      <footer className="mt-12 text-right text-xs text-slate-500">
        <span className="font-medium text-slate-400">Deployment:</span>{" "}
        {hasCommit || hasTimestamp ? (
          <>
            {hasCommit ? buildInfo.commit : "commit unavailable"}
            {hasCommit && hasTimestamp && " · "}
            {hasTimestamp ? formattedTimestamp : "timestamp unavailable"}
          </>
        ) : (
          <span className="text-slate-500">
            Metadata unavailable — configure build metadata to populate this section.
          </span>
        )}
      </footer>
    </main>
  );
}
