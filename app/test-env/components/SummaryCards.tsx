interface SummaryCardsProps {
  payloadTitle: string;
  description: string;
}

const cards = [
  {
    label: 'Step 1',
    title: 'Generate fixture',
    body: 'Preview the Poetic Brain payload scaffolded with development defaults.',
  },
  {
    label: 'Step 2',
    title: 'Inject Math Brain data',
    body: 'Paste natal geometry and symbolic weather data from Math Brain exports.',
  },
  {
    label: 'Step 3',
    title: 'Upload to Poetic Brain',
    body: 'Send the completed payload through the chat interface or API.',
  },
];

export default function SummaryCards({ payloadTitle, description }: SummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-300">{card.label}</div>
          <h3 className="mt-2 text-sm font-semibold text-slate-100">{card.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{card.body}</p>
        </article>
      ))}
      <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:col-span-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Active scenario</div>
        <h3 className="mt-2 text-sm font-semibold text-slate-100">{payloadTitle}</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      </article>
    </section>
  );
}
