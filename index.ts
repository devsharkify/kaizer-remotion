import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { KaizerClipProps, RenderRequest, WordTimestamp } from "../types";
import { execSync } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const TMP = "/tmp/kaizer-remotion";
fs.mkdirSync(TMP, { recursive: true });

const storage = multer.diskStorage({
  destination: TMP,
  filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 600 * 1024 * 1024 } });

// Cached bundle path
let bundlePath: string | null = null;

async function getBundle(): Promise<string> {
  if (bundlePath && fs.existsSync(bundlePath)) return bundlePath;
  console.log("Bundling Remotion project...");
  const entryPoint = path.join(__dirname, "../../src/index.ts");
  const fallback   = path.join(__dirname, "../index.js");
  const entry = fs.existsSync(entryPoint) ? entryPoint : fallback;
  bundlePath = await bundle({
    entryPoint: entry,
    outDir: path.join(TMP, "bundle"),
    webpackOverride: (config) => config,
  });
  console.log("Bundle ready:", bundlePath);
  return bundlePath;
}

// ── Health ──
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "kaizer-remotion", version: "1.0" });
});

// ================================================================
// POST /render
// Multipart: video file(s) + optional bottomImage + JSON body
// ================================================================
app.post(
  "/render",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "bottomImage", maxCount: 1 },
  ]),
  async (req: any, res: any) => {
    const startTime = Date.now();
    const jobId = Date.now();

    let body: RenderRequest;
    try {
      body = JSON.parse(req.body.data || "{}");
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const videoFile = req.files?.video?.[0];
    const bottomImageFile = req.files?.bottomImage?.[0];

    if (!videoFile) return res.status(400).json({ error: "No video file" });

    const ratio = body.ratio || "9:16";
    const clips = body.clips || [];

    if (!clips.length) return res.status(400).json({ error: "No clips provided" });

    console.log(`[${jobId}] Rendering ${clips.length} clips | ratio:${ratio}`);

    try {
      const bundleDir = await getBundle();

      // Composition ID based on ratio
      const compId =
        ratio === "9:16" ? "KaizerShort-916" :
        ratio === "9:10" ? "KaizerShort-910" :
        "KaizerShort-169";

      const segPaths: string[] = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const durationSec = clip.endSec - clip.startSec;
        const durationFrames = Math.round(durationSec * 30);

        if (durationFrames <= 0) {
          console.log(`[${jobId}] Clip ${i + 1} skipped — invalid duration`);
          continue;
        }

        const outputPath = path.join(TMP, `seg_${jobId}_${i}.mp4`);

        const props: KaizerClipProps = {
          videoSrc: `file://${videoFile.path}`,
          startSec: clip.startSec,
          endSec: clip.endSec,
          line1: clip.line1 || "",
          line2: clip.line2 || clip.teluguText?.slice(0, 30) || "",
          words: clip.words || [],
          ratio,
          bottomImageSrc: bottomImageFile ? `file://${bottomImageFile.path}` : undefined,
        };

        console.log(`[${jobId}] Clip ${i + 1}/${clips.length}: ${clip.startSec.toFixed(1)}→${clip.endSec.toFixed(1)}s (${durationFrames} frames)`);

        const composition = await selectComposition({
          serveUrl: bundleDir,
          id: compId,
          inputProps: props,
        });

        await renderMedia({
          composition: {
            ...composition,
            durationInFrames: durationFrames,
          },
          serveUrl: bundleDir,
          codec: "h264",
          outputLocation: outputPath,
          inputProps: props,
          chromiumOptions: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            disableWebSecurity: true,
          },
          logLevel: "warn",
        });

        segPaths.push(outputPath);
        console.log(`[${jobId}] ✓ Clip ${i + 1} done`);
      }

      if (segPaths.length === 0) {
        return res.status(400).json({ error: "All clips failed to render" });
      }

      // Merge segments
      const outputPath = path.join(TMP, `kaizer_${jobId}.mp4`);

      if (segPaths.length === 1) {
        fs.copyFileSync(segPaths[0], outputPath);
      } else {
        const listFile = outputPath + ".txt";
        fs.writeFileSync(listFile, segPaths.map((f) => `file '${f}'`).join("\n"));
        execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" 2>&1`);
        try { fs.unlinkSync(listFile); } catch (e) {}
      }

      const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const token = `${jobId}`;

      // Store for download
      pendingDownloads.set(token, outputPath);
      setTimeout(() => {
        [outputPath, videoFile.path, bottomImageFile?.path, ...segPaths]
          .filter(Boolean)
          .forEach((f) => { try { fs.unlinkSync(f!); } catch (e) {} });
        pendingDownloads.delete(token);
      }, 15 * 60 * 1000);

      console.log(`[${jobId}] ✓ Done in ${elapsed}s — ${sizeMB}MB`);

      res.json({
        success: true,
        downloadUrl: `/download/${token}`,
        sizeMB,
        elapsedSec: elapsed,
        clips: segPaths.length,
      });
    } catch (err: any) {
      console.error(`[${jobId}] Error:`, err.message);
      [videoFile?.path, bottomImageFile?.path]
        .filter(Boolean)
        .forEach((f) => { try { fs.unlinkSync(f!); } catch (e) {} });
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Download ──
const pendingDownloads = new Map<string, string>();

app.get("/download/:token", (req, res) => {
  const p = pendingDownloads.get(req.params.token);
  if (!p || !fs.existsSync(p)) return res.status(404).json({ error: "Expired" });
  res.setHeader("Content-Disposition", `attachment; filename="kaizer_${req.params.token}.mp4"`);
  res.setHeader("Content-Type", "video/mp4");
  res.sendFile(p);
});

app.listen(PORT, async () => {
  console.log(`Kaizer Remotion v1.0 on port ${PORT}`);
  // Pre-warm bundle on startup
  try {
    await getBundle();
  } catch (e: any) {
    console.warn("Bundle pre-warm failed:", e.message);
  }
});
