const NODES = [
  { id: "01", label: "Understand", x: 250, y: 80 },
  { id: "02", label: "Plan", x: 397, y: 165 },
  { id: "03", label: "Explain", x: 397, y: 335 },
  { id: "04", label: "Question", x: 250, y: 420 },
  { id: "05", label: "Evaluate", x: 103, y: 335 },
  { id: "06", label: "Adapt", x: 103, y: 165 },
];

const NODE_RADIUS = 40;
const NODE_CIRCUMFERENCE = 2 * Math.PI * NODE_RADIUS; // drives the chalk-draw stroke animation
const LONG_LABEL_MAX_CHARS = 9;
const LONG_LABEL_WIDTH = NODE_RADIUS * 2 - 16; // px, leaves ~8px padding each side

// Longer labels ("Understand") need a smaller font AND a hard width
// constraint to guarantee they stay inside the fixed-radius node —
// estimating "will 10 characters fit" from font size alone isn't reliable
// across fonts/browsers, so textLength forces an exact fit.
function labelFontSize(label: string) {
  return label.length >= LONG_LABEL_MAX_CHARS ? 12 : 16;
}

// A slightly-off, hand-drawn arc between two nodes around the ring's center.
function ringArc(from: { x: number; y: number }, to: { x: number; y: number }) {
  const cx = 250;
  const cy = 250;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // bow the midpoint slightly outward from center for a hand-drawn curve
  const bowX = mx + (mx - cx) * 0.18;
  const bowY = my + (my - cy) * 0.18;
  return `M ${from.x} ${from.y} Q ${bowX} ${bowY} ${to.x} ${to.y}`;
}

export default function TeachingLoopDiagram() {
  const ring = NODES.map((node, i) => {
    const next = NODES[(i + 1) % NODES.length];
    return { d: ringArc(node, next), delay: i * 0.18 };
  });

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 500 495"
        className="chalk-draw w-full h-auto"
        role="img"
        aria-label="The six-stage adaptive teaching loop: Understand, Plan, Explain, Question, Evaluate, Adapt, with re-explanation looping back from Evaluate to Explain when the learner is wrong."
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--chalk)" />
          </marker>
          <marker
            id="arrow-coral"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--chalk-coral)" />
          </marker>
        </defs>

        {/* main clockwise loop */}
        {ring.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke="var(--chalk)"
            strokeWidth={2.5}
            strokeLinecap="round"
            markerEnd="url(#arrow)"
            style={{ ["--len" as string]: 260, ["--delay" as string]: `${seg.delay}s` }}
            opacity={0.85}
          />
        ))}

        {/* feedback branch: Evaluate (05) back to Explain (03) when the learner is wrong */}
        <path
          d="M 103 335 C 180 430, 320 430, 397 335"
          fill="none"
          stroke="var(--chalk-coral)"
          strokeWidth={2}
          strokeDasharray="1 9"
          strokeLinecap="round"
          markerEnd="url(#arrow-coral)"
          style={{ ["--len" as string]: 320, ["--delay" as string]: "1.3s" }}
          opacity={0.9}
        />
        {/*
          Positioned below the Question node (center y=420, r=NODE_RADIUS ->
          bottom edge at y=460) with real clearance. It previously sat at
          y=452, almost inside that node's circle; since nodes render after
          this text, the node's opaque fill was clipping out the middle of
          the label while leaving both ends visible.
        */}
        <text
          x="250"
          y="480"
          textAnchor="middle"
          className="font-utility"
          fill="var(--chalk-coral)"
          fontSize="12"
          opacity={0.9}
        >
          re-explain if misunderstood
        </text>

        {/* nodes */}
        {NODES.map((node, i) => (
          <g key={node.id} style={{ ["--delay" as string]: `${i * 0.18 + 0.05}s` }}>
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill="var(--board-panel-raised)"
              stroke="var(--chalk-yellow)"
              strokeWidth={2}
              style={{ ["--len" as string]: NODE_CIRCUMFERENCE }}
              className="chalk-draw"
            />
            <text
              x={node.x}
              y={node.y - (NODE_RADIUS + 10)}
              textAnchor="middle"
              className="font-utility"
              fill="var(--chalk-dim)"
              fontSize="11"
              letterSpacing="0.08em"
            >
              {node.id}
            </text>
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="font-display"
              fill="var(--chalk)"
              fontSize={labelFontSize(node.label)}
              {...(node.label.length >= LONG_LABEL_MAX_CHARS
                ? { textLength: LONG_LABEL_WIDTH, lengthAdjust: "spacingAndGlyphs" }
                : {})}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}