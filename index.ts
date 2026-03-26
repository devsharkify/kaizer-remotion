// KAIZER REMOTION SERVER v1.0
// All files flat at root — no src/ folder needed

import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execSync } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const TMP = "/tmp/kaizer-remotion";
fs.mkdirSync(TMP, { recursive: true });

const storage = multer.diskStorage({
  destination: TMP,
  filename: (req: any, file: any, cb: any) => cb(null, `upload_${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 600 * 1024 * 1024 } });

let bundlePath: string | null = null;

async function getBundle(): Promise<string> {
  if (bundlePath && fs.existsSync(bundlePath)) return bundlePath;
  console.log("Bundling Remotion...");
  bundlePath = await bundle({
    entryPoint: path.join(__dirname, "Root.ts"),
    outDir: path.join(TMP, "bundle"),
    webpackOverride: (config: any) => {
      // Ensure ts-loader handles tsx files
      const tsRule = config.module?.rules?.find((r: any) =>
        r.test && r.test.toString().includes('tsx')
      );
      if (!tsRule) {
        config.module = config.module || { rules: [] };
        config.module.rules = config.module.rules || [];
        config.module.rules.push({
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [{
            loader: require.resolve('ts-loader'),
            options: { transpileOnly: true }
          }]
        });
      }
      return config;
    },
  });
  console.log("Bundle ready:", bundlePath);
  return bundlePath;
}

// ── Serve uploaded files via HTTP so Remotion can access them ──
app.use("/media", express.static(TMP));

app.get("/", (req: any, res: any) => {
  res.json({ status: "ok", service: "kaizer-remotion", version: "1.0" });
});

app.post(
  "/render",
  (upload as any).fields([{ name: "video", maxCount: 1 }, { name: "bottomImage", maxCount: 1 }]),
  async (req: any, res: any) => {
    const startTime = Date.now();
    const jobId = Date.now();
    let body: any;
    try { body = JSON.parse(req.body.data || "{}"); } catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }

    const videoFile = req.files?.video?.[0];
    const bottomImageFile = req.files?.bottomImage?.[0];
    if (!videoFile) return res.status(400).json({ error: "No video file" });

    const ratio = body.ratio || "9:16";
    const clips = body.clips || [];
    if (!clips.length) return res.status(400).json({ error: "No clips" });

    const baseUrl = `http://localhost:${PORT}`;
    const videoUrl = `${baseUrl}/media/${path.basename(videoFile.path)}`;
    const bottomImageUrl = bottomImageFile ? `${baseUrl}/media/${path.basename(bottomImageFile.path)}` : undefined;
    console.log(`[${jobId}] Rendering ${clips.length} clips | ${ratio} | video: ${videoUrl}`);

    try {
      const bundleDir = await getBundle();
      const compId = ratio === "9:16" ? "KaizerShort-916" : ratio === "9:10" ? "KaizerShort-910" : "KaizerShort-169";
      const segPaths: string[] = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const durationSec = clip.endSec - clip.startSec;
        const durationFrames = Math.round(durationSec * 30);
        if (durationFrames <= 0) continue;

        const outputPath = path.join(TMP, `seg_${jobId}_${i}.mp4`);
        const props = {
          videoSrc: videoUrl,
          startSec: clip.startSec,
          endSec: clip.endSec,
          line1: clip.line1 || "",
          line2: clip.line2 || clip.teluguText?.slice(0, 30) || "",
          words: clip.words || [],
          ratio,
          bottomImageSrc: bottomImageUrl,
        };

        console.log(`[${jobId}] Clip ${i+1}: ${clip.startSec.toFixed(1)}→${clip.endSec.toFixed(1)}s`);

        const W = ratio === "9:16" ? 1080 : ratio === "9:10" ? 1080 : 1920;
        const H = ratio === "9:16" ? 1920 : ratio === "9:10" ? 1200 : 1080;

        const composition = await selectComposition({ serveUrl: bundleDir, id: compId, inputProps: props });
        await renderMedia({
          composition: { ...composition, durationInFrames: durationFrames, width: W, height: H },
          serveUrl: bundleDir,
          codec: "h264",
          outputLocation: outputPath,
          inputProps: props,
          chromiumOptions: {
            disableWebSecurity: true,
          },
          browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          logLevel: "warn",
        });

        segPaths.push(outputPath);
        console.log(`[${jobId}] ✓ Clip ${i+1}`);
      }

      if (!segPaths.length) return res.status(400).json({ error: "All clips failed" });

      const outputPath = path.join(TMP, `kaizer_${jobId}.mp4`);
      if (segPaths.length === 1) {
        fs.copyFileSync(segPaths[0], outputPath);
      } else {
        const listFile = outputPath + ".txt";
        fs.writeFileSync(listFile, segPaths.map(f => `file '${f}'`).join("\n"));
        execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" 2>&1`);
        try { fs.unlinkSync(listFile); } catch(e) {}
      }

      const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const token = `${jobId}`;
      pendingDownloads.set(token, outputPath);

      setTimeout(() => {
        [outputPath, videoFile.path, bottomImageFile?.path, ...segPaths].filter(Boolean)
          .forEach(f => { try { fs.unlinkSync(f!); } catch(e) {} });
        pendingDownloads.delete(token);
      }, 15 * 60 * 1000);

      console.log(`[${jobId}] ✓ Done ${elapsed}s ${sizeMB}MB`);
      res.json({ success: true, downloadUrl: `/download/${token}`, sizeMB, elapsedSec: elapsed, clips: segPaths.length });

    } catch (err: any) {
      console.error(`[${jobId}] Render error:`, err.message, err.stack?.slice(0, 500));
      [videoFile?.path, bottomImageFile?.path].filter(Boolean).forEach(f => { try { fs.unlinkSync(f!); } catch(e) {} });
      if (!res.headersSent) res.status(500).json({ error: err.message || 'Unknown render error' });
    }
  }
);

const pendingDownloads = new Map<string, string>();
app.get("/download/:token", (req: any, res: any) => {
  const p = pendingDownloads.get(req.params.token);
  if (!p || !fs.existsSync(p)) return res.status(404).json({ error: "Expired" });
  res.setHeader("Content-Disposition", `attachment; filename="kaizer_${req.params.token}.mp4"`);
  res.setHeader("Content-Type", "video/mp4");
  res.sendFile(p);
});

app.listen(PORT, async () => {
  console.log(`Kaizer Remotion v1.0 on port ${PORT}`);
  try { await getBundle(); } catch(e: any) { console.warn("Pre-warm failed:", e.message); }
});
