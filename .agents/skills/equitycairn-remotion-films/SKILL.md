---
name: equitycairn-remotion-films
description: Create or refine concise, premium Remotion product films and original visual assets for EquityCairn. Use for homepage, launch, or campaign videos in this repository; do not change the website or Penpot design unless explicitly requested.
---

# EquityCairn Remotion films

Create short, polished product films that communicate EquityCairn's value clearly and earn trust with finance audiences. Take inspiration from Apple's restraint, precision, and focus; keep EquityCairn's own brand, product, and voice.

## Repo boundaries

- Keep video compositions, artwork, posters, and rendered outputs inside `remotion/`: source in `remotion/videos/`, static assets in `remotion/public/`, renders in `remotion/output/`.
- Use pnpm and the existing `video:setup`, `video:studio`, and `video:render:home` scripts. Add new compositions to the Remotion root and provide a suitable render script when needed.
- The Remotion project is excluded from the Next.js TypeScript and ESLint projects. Do not import its source into the website.
- Do not embed a video in the homepage or edit Penpot designs unless the user explicitly asks. Root package/config changes are for Remotion tooling only.
- Follow this repository's `AGENTS.md` and Trail workflow before changing code. Inspect the current composition and render before refining an existing video.

## Creative principles

- Lead with one audience benefit, expressed in a short, memorable line. Make the visual sequence demonstrate that benefit.
- For a homepage loop, aim for about 6–10 seconds unless the brief calls for another length. Build a simple arc: immediate hook, clear product transformation, composed end frame. Keep the final and opening states compatible for a seamless loop.
- Favor product-led composition, generous negative space, strong typographic hierarchy, and a small number of deliberate transitions. Motion should clarify relationships and guide attention; avoid repetitive fade-ups, decorative movement, or UI chrome that makes the film look like a webpage screenshot.
- Use the existing EquityCairn palette: mist `#F4FCFD`, aqua `#D1F2F5`, deep teal `#071F22`, and restrained blue `#366FBF`. Prefer the locally available Inter typeface. Keep text and product details readable at half size and on mobile.
- For finance content, protect credibility: use only verified product capabilities, clearly label illustrative feed content, and avoid invented market facts, return claims, trading imagery, recommendations, or promises of financial performance. Keep the film understandable without audio.
- Create original visual assets that support the concept. Use SVG or Remotion-native shapes for clean interface and graphic elements; use image generation for raster artwork when an image-generation tool is available and raster imagery improves the idea. Keep all assets in `remotion/`.

## Workflow and finish criteria

1. Identify the target viewer, desired takeaway, product truth, and any approved CTA. Ask only when a missing product claim or core message cannot be inferred safely.
2. Write a compact beat outline before animating. Prioritize one main idea over a feature list.
3. Build the composition and supporting artwork in `remotion/`, using frame-based timing and purposeful easing. Keep the product moment and key copy visible long enough to understand.
4. Render the requested MP4 and poster into `remotion/output/` and `remotion/public/` respectively. Do not stop at a preview composition when the brief asks for a finished video.
5. Convert each rendered MP4 to WebM in `remotion/output/` with FFmpeg, preserving audio when present and avoiding overwrites:

   ```bash
   ffmpeg -n -i remotion/output/<video-name>.mp4 -map 0:v:0 -map '0:a?' -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 128k remotion/output/<video-name>.webm
   ```

   If FFmpeg is unavailable or the VP9 encoder is missing, report that WebM conversion is blocked; do not silently omit the requested format.

6. Inspect a contact sheet covering the opening, key transition, product reveal, final hold, and loop boundary. Check legibility at reduced size, contrast, clipping, timing, and whether the message works without sound. Use `ffprobe` on both files to confirm codecs, dimensions, frame rates, durations, and file sizes; inspect the WebM for visible compression artifacts.
7. Refine problems found in either render, then report both deliverables, their formats and sizes, runtime, and any remaining tradeoffs.

A film is ready when a viewer can understand its single benefit quickly, see the product make that benefit real, read the important details on a small display, and reach a deliberate final frame without unsupported finance claims.
