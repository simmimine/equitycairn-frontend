import { loadFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

// Bundled with the render, so it doesn't depend on the machine's fonts.
const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const C = {
  mist: "#F4FCFD",
  aqua: "#D1F2F5",
  teal: "#071F22",
  blue: "#366FBF",
  muted: "#46666B",
  soft: "#69868A",
  border: "#C7E2E5",
  white: "#FFFFFF",
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const enter = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

function CoverageFragment({
  frame,
  start,
  x,
  y,
  width,
  rotate,
  label,
}: {
  frame: number;
  start: number;
  x: number;
  y: number;
  width: number;
  rotate: number;
  label: string;
}) {
  const travel = enter(frame, start, start + 46);
  const fade = interpolate(frame, [start + 38, start + 49], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const destinationX = 792;
  const destinationY = 356;
  const dx = interpolate(travel, [0, 1], [x, destinationX]);
  const dy = interpolate(travel, [0, 1], [y, destinationY]);
  const scale = interpolate(travel, [0, 1], [1, 0.18]);

  return (
    <div
      style={{
        position: "absolute",
        left: dx,
        top: dy,
        width,
        height: 48,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        border: `1px solid ${C.border}`,
        borderRadius: 13,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 10px 24px rgba(7,31,34,0.06)",
        color: C.soft,
        fontSize: 13,
        letterSpacing: 0.15,
        opacity: (1 - travel) * fade,
        transform: `translate(-50%, -50%) rotate(${rotate * (1 - travel)}deg) scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          flex: "0 0 auto",
          borderRadius: 99,
          backgroundColor: label === "Source C" ? C.blue : "#71BFC7",
        }}
      />
      {label}
    </div>
  );
}

function StoryRow({
  frame,
  start,
  time,
  title,
  sources,
}: {
  frame: number;
  start: number;
  time: string;
  title: string;
  sources: string;
}) {
  const progress = enter(frame, start, start + 21);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "76px 1fr auto",
        alignItems: "center",
        gap: 18,
        minHeight: 104,
        padding: "0 28px",
        borderTop: `1px solid ${C.border}`,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 12}px)`,
      }}
    >
      <span
        style={{
          color: C.soft,
          fontSize: 18,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </span>
      <div>
        <div
          style={{
            color: C.teal,
            fontSize: 21,
            fontWeight: 650,
            letterSpacing: -0.35,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 9, color: C.muted, fontSize: 16 }}>
          {sources}
        </div>
      </div>
      <span
        style={{
          padding: "7px 11px",
          borderRadius: 99,
          backgroundColor: C.mist,
          color: C.blue,
          fontSize: 14,
          whiteSpace: "nowrap",
        }}
      >
        2 sources
      </span>
    </div>
  );
}

function Fragments({ frame }: { frame: number }) {
  return (
    <>
      <CoverageFragment
        frame={frame}
        start={0}
        x={1000}
        y={160}
        width={220}
        rotate={-5}
        label="Source A"
      />
      <CoverageFragment
        frame={frame}
        start={8}
        x={1220}
        y={302}
        width={238}
        rotate={4}
        label="Company coverage"
      />
      <CoverageFragment
        frame={frame}
        start={15}
        x={1045}
        y={480}
        width={204}
        rotate={-3}
        label="Source B"
      />
      <CoverageFragment
        frame={frame}
        start={22}
        x={1280}
        y={612}
        width={202}
        rotate={5}
        label="Company coverage"
      />
      <CoverageFragment
        frame={frame}
        start={29}
        x={792}
        y={104}
        width={196}
        rotate={2}
        label="Source C"
      />
    </>
  );
}

export function HomeWatchlistVideo() {
  const frame = useCurrentFrame();
  // The last second returns to the first frame, so the loop has no jump.
  const outro = enter(frame, 216, 239);
  const headline = enter(frame, 3, 22) * (1 - outro);
  const assembled = enter(frame, 69, 101);
  const card = assembled * (1 - outro);
  const signal = enter(frame, 50, 80);
  const glow = interpolate(frame, [70, 106, 142], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: C.mist,
        color: C.teal,
        fontFamily: fontFamily,
      }}
    >
      <Img
        src={staticFile("images/homepage-video-illustration.svg")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 104,
          top: 172,
          width: 350,
          opacity: headline,
          transform: `translateY(${(1 - headline) * 16}px)`,
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 680,
            lineHeight: 1.04,
            letterSpacing: -3,
          }}
        >
          Less noise.
          <br />
          <span style={{ color: C.blue }}>More signal.</span>
        </div>
        <div
          style={{
            marginTop: 28,
            width: 305,
            color: C.muted,
            fontSize: 22,
            lineHeight: 1.48,
          }}
        >
          Coverage, organized around the companies you follow.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - assembled,
          pointerEvents: "none",
        }}
      >
        <Fragments frame={frame} />
        <div
          style={{
            position: "absolute",
            left: 792,
            top: 356,
            width: 158,
            height: 158,
            display: "grid",
            placeItems: "center",
            borderRadius: 30,
            backgroundColor: C.aqua,
            boxShadow: `0 0 ${24 + glow * 36}px rgba(54,111,191,${0.04 + glow * 0.09})`,
            opacity: signal,
            transform: `translate(-50%, -50%) scale(${0.75 + signal * 0.25})`,
          }}
        >
          <span style={{ fontSize: 31, fontWeight: 750, letterSpacing: -1.2 }}>
            ACME
          </span>
        </div>
      </div>

      <AbsoluteFill style={{ opacity: outro }}>
        <Fragments frame={0} />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 492,
          top: 223,
          width: 850,
          height: 458,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
          borderRadius: 26,
          backgroundColor: C.white,
          boxShadow: `0 28px 76px rgba(7,31,34,${0.08 + glow * 0.045})`,
          opacity: card,
          transform: `translateY(${(1 - card) * 22}px) scale(${0.97 + card * 0.03})`,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            height: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 30px",
            backgroundColor: C.aqua,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{ fontSize: 25, fontWeight: 750, letterSpacing: -0.8 }}
            >
              ACME
            </span>
            <span style={{ color: C.muted, fontSize: 17 }}>
              Watchlist coverage
            </span>
          </div>
          <span
            style={{
              padding: "9px 13px",
              borderRadius: 99,
              backgroundColor: "rgba(255,255,255,0.82)",
              color: C.muted,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            ILLUSTRATIVE
          </span>
        </div>

        <div style={{ padding: "25px 30px 18px" }}>
          <div
            style={{
              color: C.soft,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            GROUPED FOR ONE COMPANY
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 26,
              fontWeight: 650,
              letterSpacing: -0.7,
            }}
          >
            Recent coverage
          </div>
        </div>

        <StoryRow
          frame={frame}
          start={100}
          time="09:42"
          title="Example coverage: product update"
          sources="Example source A  ·  Example source B"
        />
        <StoryRow
          frame={frame}
          start={116}
          time="09:18"
          title="Example coverage: company overview"
          sources="Example source A  ·  Example source C"
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 106,
          bottom: 49,
          color: C.soft,
          fontSize: 15,
          opacity: Math.max(headline, card),
        }}
      >
        Illustrative content · Not investment advice
      </div>
    </AbsoluteFill>
  );
}
