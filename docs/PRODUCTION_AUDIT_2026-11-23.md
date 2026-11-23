# MYSTERY VERSE — Production Audit
Date: 2026-11-23
Repository: `alianaputri0910-ship-it/mystery-verse-ai-studio.`
Branch inspected: `main`

## Confirmed working design in source
- Existing Shorts renderer is `scripts/render-vuza.py`.
- Indonesian narration voice: `id-ID-ArdiNeural`, fixed rate `-10%`.
- Portrait output: 1080x1920 (9:16), 30 fps.
- Renderer requires exactly 8 scenes, including CTA, and enforces 40–75 seconds including the 3.5-second branded opening.
- Word-boundary timestamps from Edge TTS are used to animate captions word by word in the gold subtitle style.
- The render adds a MYSTERY VERSE watermark near the top, generated ambience, and a branded opening.
- The current GitHub Actions workflow is `.github/workflows/build-video.yml`, manually dispatched or triggered by selected pushes to `main`.
- Current workflow installs Node 22, Python 3.11, FFmpeg, Edge TTS, MoviePy, Pillow, NumPy and Chrome, generates a story and images, renders an MP4, validates/re-encodes it, and uploads `output/` as the `mystery-verse-production` artifact.

## Important gaps and risks found
1. **Topic input is not a true story generator yet.** `scripts/generate-story.js` accepts a topic string but its narration, scenes, title, description and prompts are hard-coded to the Setagaya case. A new topic can therefore be labelled as one case while the video still tells the Setagaya story. Do not use arbitrary topic inputs until this is fixed.
2. **The current renderer is Shorts-only.** It requires 8 scenes and 40–75 seconds. There is no verified long-form rendering workflow in the files inspected.
3. **No YouTube publishing step exists in the workflow.** It currently saves a downloadable Actions artifact only. Uploading/scheduling requires explicit YouTube OAuth authorization and protected GitHub secrets.
4. **Image generation requires a Pollinations API key.** The workflow fails if `POLLINATIONS_API_KEY` is missing; this is not an API-free pipeline.
5. **Workflow wording is stale.** The render step says “40-60 second Shorts” while the renderer accepts 40–75 seconds.
6. **No end-to-end run or output artifact was verified in this audit.** Source inspection confirms the configured steps, not a successful current Actions execution.
7. **Editorial/monetization safeguard needed.** Every episode must have distinct research, a factual source list, original narration and meaningful creative value. Avoid mass-produced interchangeable scripts, slideshows or reused footage.

## Production decisions to preserve
- Keep the existing MYSTERY VERSE identity and branded opening/closing.
- Keep Indonesian conversational narration, male ArdiNeural voice, rate -10%.
- Keep word-by-word synchronized gold subtitles.
- Keep Shorts vertical 9:16, 1080x1920, 30 fps, with the current 40–75 second renderer limit.
- Develop a separate long-form pipeline rather than stretching the Shorts renderer.

## Safe implementation sequence
1. Fix topic-to-script generation so every scene, narration, visual prompt, title and metadata actually correspond to the selected topic. Add factual-source notes and a pre-render validation step.
2. Add a separate long-form format/schema and renderer; do not weaken the Shorts 8-scene/40–75-second checks.
3. Add a publishing workflow only after the channel owner completes OAuth authorization. Start with private uploads and explicit review; enable scheduled/public publishing only after a successful test.
4. Add upload metadata, thumbnail, disclosure checks where required, and an upload log.
5. Run a test build for each format, inspect the MP4 and captions, and retain artifacts before enabling recurring automation.

## Secrets and account safety
Never commit OAuth client secrets, refresh tokens, API keys, passwords or OTPs. Store required credentials only in GitHub Actions Secrets. Channel owner must complete Google/YouTube authorization and AdSense identity, address and payment verification personally.
