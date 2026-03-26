import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { KaizerClipProps } from "./types";
import { VideoClip } from "./components/VideoClip";
import { AnimatedStrip } from "./components/AnimatedStrip";
import { WordCaptions } from "./components/WordCaptions";
import { KaizerLogo } from "./components/KaizerLogo";
import { BottomImage } from "./components/BottomImage";

export const KaizerShort: React.FC<KaizerClipProps> = ({
  videoSrc,
  startSec,
  endSec,
  line1,
  line2,
  words,
  ratio,
  bottomImageSrc,
}) => {
  const { width, height } = useVideoConfig();

  // ── Layout zones based on ratio ──
  let videoHeight: number;
  let stripTop: number;
  let stripHeight: number;
  let imageTop: number;
  let captionBottom: number;

  if (ratio === "9:16") {
    // 1080×1920
    videoHeight  = 1020;  // top 53%
    stripTop     = 880;   // floating center
    stripHeight  = 360;
    imageTop     = 1160;  // bottom zone
    captionBottom = 420;  // above strip
  } else if (ratio === "9:10") {
    // 540×600 → scaled to 1080×1200
    videoHeight  = 640;
    stripTop     = 540;
    stripHeight  = 240;
    imageTop     = 700;
    captionBottom = 300;
  } else {
    // 16:9 — 1920×1080
    videoHeight  = height;
    stripTop     = height - 280;
    stripHeight  = 240;
    imageTop     = height;
    captionBottom = 300;
  }

  return (
    <AbsoluteFill style={{ background: "#000" }}>

      {/* TOP VIDEO ZONE */}
      <VideoClip
        src={videoSrc}
        startSec={startSec}
        ratio={ratio}
        heightPx={videoHeight}
      />

      {/* BOTTOM IMAGE (9:16 / 9:10 only) */}
      {bottomImageSrc && ratio !== "16:9" && (
        <BottomImage src={bottomImageSrc} topPx={imageTop} />
      )}

      {/* WORD-BY-WORD CAPTIONS */}
      {words && words.length > 0 && (
        <WordCaptions
          words={words}
          startSec={startSec}
          bottomPx={captionBottom}
        />
      )}

      {/* ANIMATED RED STRIP */}
      <AnimatedStrip
        line1={line1}
        line2={line2}
        topPx={stripTop}
        heightPx={stripHeight}
      />

      {/* KAIZER LOGO */}
      <KaizerLogo />

    </AbsoluteFill>
  );
};
