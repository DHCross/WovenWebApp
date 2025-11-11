'use client';

import React, { useState } from 'react';

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: 'var(--muted)',
  margin: '8px 0 10px',
};

function GlossaryItem({
  symbol,
  title,
  description,
  details,
}: {
  symbol: string;
  title: string;
  description: string;
  details?: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glossary-item"
      style={{
        marginBottom: 12,
        padding: 8,
        border: '1px solid var(--line)',
        borderRadius: 6,
        background: 'var(--soft)',
      }}
      title={`${title}: ${description}`} // Tooltip with title and description
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: details ? 'pointer' : 'default',
        }}
        onClick={() => details && setExpanded(!expanded)}
      >
        <span
          style={{ fontSize: 16 }}
          title={`${symbol} ${title} - ${description}`} // Enhanced tooltip for the symbol
        >
          {symbol}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text)' }}
          >
            {title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {description}
          </div>
        </div>
        {details && (
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      {details && expanded && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--line)',
          }}
        >
          {details.map((detail, i) => (
            <div
              key={i}
              style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}
            >
              • {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Glossary() {
  return (
    <div>
      <div style={sectionTitle}>Balance Meter Framework</div>

      <GlossaryItem
        symbol="⚡"
        title="Magnitude"
        description="Symbolic intensity scale"
        details={[
          '0 = Trace',
          '1 = Pulse',
          '2 = Wave',
          '3 = Surge',
          '4 = Peak',
          '5 = Threshold',
        ]}
      />

      <GlossaryItem
        symbol="🌞"
        title="Directional Bias"
        description="Expansion/Contraction tilt (−5 to +5)"
        details={[
          'Expansive (+) = growth, ease, opening',
          'Neutral (0) = balanced field',
          'Contractive (−) = friction, constraint, compression',
          "Replaces legacy 'Valence' term (v5.0)",
        ]}
      />

      <GlossaryItem
        symbol="🌡️"
        title="Balance Meter v5.0"
        description="Two-axis symbolic accelerometer"
        details={[
          'Magnitude (0–5): Intensity scale',
          'Directional Bias (−5 to +5): Expansion/contraction tilt',
          'Tracks symbolic weather in real-time',
          'Provides falsifiable pressure diagnostics',
        ]}
      />

      <div style={sectionTitle}>Directional Bias Modes</div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
        Expansive Bias (+)
      </div>
      <GlossaryItem
        symbol="🌱"
        title="Fertile Field"
        description="Growth, fresh shoots"
      />
      <GlossaryItem
        symbol="✨"
        title="Harmonic Resonance"
        description="Natural ease"
      />
      <GlossaryItem
        symbol="💎"
        title="Expansion Lift"
        description="Confidence, abundance"
      />
      <GlossaryItem
        symbol="🔥"
        title="Combustion Clarity"
        description="Breakthrough insight"
      />
      <GlossaryItem
        symbol="🦋"
        title="Liberation / Release"
        description="Uranian fresh air"
      />
      <GlossaryItem
        symbol="🧘"
        title="Integration"
        description="Opposites reconcile"
      />
      <GlossaryItem
        symbol="🌊"
        title="Flow Tide"
        description="Smooth adaptability"
      />
      <GlossaryItem
        symbol="🌈"
        title="Visionary Spark"
        description="Inspiration, transcendence"
      />

      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          marginBottom: 8,
          marginTop: 12,
        }}
      >
        Contractive Bias (−)
      </div>
      <GlossaryItem
        symbol="🌪"
        title="Recursion Pull"
        description="Old cycles re-emerge"
      />
      <GlossaryItem
        symbol="⚔"
        title="Friction Clash"
        description="Conflict, accidents"
      />
      <GlossaryItem
        symbol="🌊"
        title="Cross Current"
        description="Competing flows, confusion"
      />
      <GlossaryItem
        symbol="🌫"
        title="Fog / Dissolution"
        description="Blurred boundaries, signals scatter"
      />
      <GlossaryItem
        symbol="🌋"
        title="Pressure / Eruption"
        description="Compression until release"
      />
      <GlossaryItem
        symbol="🕰"
        title="Saturn Weight"
        description="Heaviness, delay"
      />
      <GlossaryItem
        symbol="🧩"
        title="Fragmentation"
        description="Fractured focus"
      />
      <GlossaryItem
        symbol="⬇️"
        title="Entropy Drift"
        description="Inertia, energy drains away"
      />

      <div style={sectionTitle}>Sources of Force</div>

      <GlossaryItem
        symbol="🎯"
        title="Orb"
        description="Proximity factor in aspects"
      />
      <GlossaryItem
        symbol="🌀"
        title="Aspect"
        description="Angular relationship type"
      />
      <GlossaryItem
        symbol="🪐"
        title="Potency"
        description="Planet speed and strength"
      />
      <GlossaryItem
        symbol="📡"
        title="Resonance"
        description="Natal chart activation"
      />

      <div style={sectionTitle}>Planetary Forces</div>

      <GlossaryItem
        symbol="☽"
        title="Moon"
        description="Emotional tides, instinctive patterns"
      />
      <GlossaryItem
        symbol="☿"
        title="Mercury"
        description="Communication, thought processing"
      />
      <GlossaryItem
        symbol="♀"
        title="Venus"
        description="Values, relationships, beauty"
      />
      <GlossaryItem
        symbol="♂"
        title="Mars"
        description="Action, drive, assertion"
      />
      <GlossaryItem
        symbol="♃"
        title="Jupiter"
        description="Expansion, wisdom, growth"
      />
      <GlossaryItem
        symbol="♄"
        title="Saturn"
        description="Structure, discipline, limits"
      />
      <GlossaryItem
        symbol="♅"
        title="Uranus"
        description="Innovation, rebellion, awakening"
      />
      <GlossaryItem
        symbol="♆"
        title="Neptune"
        description="Dreams, spirituality, illusion"
      />
      <GlossaryItem
        symbol="♇"
        title="Pluto"
        description="Transformation, depth, power"
      />

      <div style={sectionTitle}>Core Dynamics</div>

      <GlossaryItem
        symbol="↔"
        title="Polarity"
        description="Dynamic tension between forces"
      />
      <GlossaryItem
        symbol="🪞"
        title="Mirror"
        description="Reflection of inner patterns"
      />
      <GlossaryItem
        symbol="🌡️"
        title="Balance"
        description="Current energetic state"
      />
      <GlossaryItem
        symbol="📔"
        title="Journal"
        description="Personal narrative tracking"
      />
      <GlossaryItem
        symbol="⚡"
        title="Symbolic Quake"
        description="Energetic disturbance measurement"
        details={[
          'Seismograph-style intensity scale',
          'Tracks symbolic rather than literal events',
          'Measures psychological/spiritual impact',
        ]}
      />
      <GlossaryItem
        symbol="🎭"
        title="Poetic Insert"
        description="Artistic interpretation of patterns"
        details={[
          'Transforms analysis into poetry',
          'Captures essence beyond literal meaning',
          'Bridges symbolic and creative expression',
        ]}
      />
    </div>
  );
}
