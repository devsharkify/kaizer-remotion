import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface AnimatedStripProps {
  line1: string;
  line2: string;
  topPx: number;    // Y position of strip center
  heightPx: number; // strip height
}

// Torn edge path — deterministic (no random, same every frame)
const tornTop = `M0,${20} C27,6 54,22 81,10 C108,1 135,18 162,8 C189,2 216,16 243,7 C270,1 297,17 324,8 C351,2 378,16 405,7 C432,1 459,17 486,8 C513,2 540,16 567,7 C594,1 621,17 648,8 C675,2 702,16 729,8 C756,1 783,17 810,8 C837,2 864,16 891,7 C918,1 945,17 972,8 C999,2 1026,16 1053,7 C1067,3 1074,11 1080,8 L1080,${30} L0,${30} Z`;

const tornBottom = (h: number) =>
  `M0,${h - 20} C27,${h - 6} 54,${h - 22} 81,${h - 10} C108,${h - 1} 135,${h - 18} 162,${h - 8} C189,${h - 2} 216,${h - 16} 243,${h - 7} C270,${h - 1} 297,${h - 17} 324,${h - 8} C351,${h - 2} 378,${h - 16} 405,${h - 7} C432,${h - 1} 459,${h - 17} 486,${h - 8} C513,${h - 2} 540,${h - 16} 567,${h - 7} C594,${h - 1} 621,${h - 17} 648,${h - 8} C675,${h - 2} 702,${h - 16} 729,${h - 8} C756,${h - 1} 783,${h - 17} 810,${h - 8} C837,${h - 2} 864,${h - 16} 891,${h - 7} C918,${h - 1} 945,${h - 17} 972,${h - 8} C999,${h - 2} 1026,${h - 16} 1053,${h - 7} C1067,${h - 3} 1074,${h - 11} 1080,${h - 8} L1080,${h + 10} L0,${h + 10} Z`;

export const AnimatedStrip: React.FC<AnimatedStripProps> = ({ line1, line2, topPx, heightPx }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Strip slides up from below
  const STRIP_ENTER = 12;
  const slideProgress = spring({
    frame: frame - STRIP_ENTER,
    fps,
    config: { damping: 14, stiffness: 160 },
    durationInFrames: 25,
  });
  const translateY = interpolate(slideProgress, [0, 1], [heightPx * 1.5, 0]);

  // Line 1 fade in
  const line1Opacity = interpolate(frame, [STRIP_ENTER + 8, STRIP_ENTER + 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Line 2 scale pop
  const line2Scale = spring({
    frame: frame - (STRIP_ENTER + 14),
    fps,
    config: { damping: 9, stiffness: 220 },
    durationInFrames: 20,
  });
  const line2Opacity = interpolate(frame, [STRIP_ENTER + 14, STRIP_ENTER + 22], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{
      position: "absolute",
      top: topPx,
      left: 0,
      width,
      height: heightPx,
      transform: `translateY(${translateY}px)`,
      zIndex: 20,
    }}>
      {/* Red gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #9a0000 0%, #E50914 45%, #9a0000 100%)",
      }} />

      {/* Torn top SVG */}
      <svg
        viewBox={`0 0 1080 ${heightPx}`}
        style={{ position: "absolute", top: -28, left: 0, width: "100%", height: heightPx + 32, pointerEvents: "none" }}
        preserveAspectRatio="none"
      >
        <path d={tornTop} fill="#000000" />
      </svg>

      {/* Torn bottom SVG */}
      <svg
        viewBox={`0 0 1080 ${heightPx}`}
        style={{ position: "absolute", bottom: -28, left: 0, width: "100%", height: heightPx + 32, pointerEvents: "none" }}
        preserveAspectRatio="none"
      >
        <path d={tornBottom(heightPx)} fill="#000000" />
      </svg>

      {/* Line 1 — white */}
      <div style={{
        position: "absolute",
        top: "28%",
        width: "100%",
        textAlign: "center",
        fontFamily: "sans-serif",
        fontWeight: 700,
        fontSize: 72,
        color: "white",
        textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)",
        opacity: line1Opacity,
        letterSpacing: 1,
        padding: "0 40px",
      }}>
        {line1}
      </div>

      {/* Line 2 — yellow bold */}
      <div style={{
        position: "absolute",
        top: "58%",
        width: "100%",
        textAlign: "center",
        fontFamily: "sans-serif",
        fontWeight: 900,
        fontSize: 88,
        color: "#FFD700",
        textShadow: "0 3px 20px rgba(0,0,0,1), 0 0 60px rgba(255,200,0,0.3)",
        opacity: line2Opacity,
        transform: `scale(${interpolate(line2Scale, [0, 1], [0.6, 1])})`,
        transformOrigin: "center center",
        letterSpacing: 1,
        padding: "0 40px",
      }}>
        {line2}
      </div>
    </div>
  );
};
