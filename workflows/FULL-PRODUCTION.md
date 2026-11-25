# MYSTERY VERSE Studio — Full Production

## One-click production

Open GitHub → Actions → **MYSTERY VERSE Studio - Full Production** → Run workflow → choose `trunyan`.

The workflow executes the existing production engines in sequence:

1. Validate channel configuration and Trunyan episode data.
2. Generate all 9 Shorts images (opening + 8 scenes).
3. Render the Shorts MP4 with Edge-TTS narration and word-level captions.
4. Generate the long-form chapter visuals and thumbnail.
5. Render the long-form MP4 with narration and word-level captions.
6. Run FFprobe and full FFmpeg decode checks.
7. Upload a review package as a GitHub Actions artifact.

## Required GitHub Secret

Set `POLLINATIONS_API_KEY` in repository Settings → Secrets and variables → Actions. Never commit API keys.

Edge-TTS is installed during the workflow. No voice API key is assumed.

## Owner approval

This workflow creates production artifacts only. It does not upload or publish to YouTube. Watch both complete videos, inspect the metadata, facts, sources, cultural context, AI reconstruction disclosure and thumbnail, then upload manually after approval.

## Current scope

The initial one-click workflow is intentionally limited to the existing, validated `trunyan` episode. Other episodes must be added to the workflow choice only after their short and long-form source files and render inputs have been validated.

The existing `build-video.yml` and `build-longform.yml` workflows remain unchanged.
