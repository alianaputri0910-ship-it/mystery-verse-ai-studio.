# MYSTERY VERSE Studio

AI-assisted production workspace for the MYSTERY VERSE YouTube channel.

## Workspace layout

- `config/` — brand, locked visual style, voice profiles, and export profiles.
- `research/` — topic backlog and source notes.
- `episodes/episode-001/` — episode research, script, storyboard, visuals, audio, subtitles, output, and QC report.
- `src/` — research, scripting, visual, audio, render, subtitle, and quality-control modules.
- `remotion/` — reserved composition layer for a tested Remotion migration.
- `scripts/` — production utilities and episode validation.
- `workflows/` — workflow documentation.
- `.github/workflows/` — manual research, production validation, render preflight, and QC workflows.

## Existing production compatibility

Existing assets, Trunyan episode files, `build-video.yml`, `build-longform.yml`, and legacy rendering scripts are preserved. The new `render.yml` is a preflight check only; the existing build workflows remain the actual render entry points until migration is tested.

## Episode validation

Run locally:

```bash
node scripts/validate-episode.mjs episode-001 --stage=research
node scripts/validate-episode.mjs episode-001 --stage=production
node scripts/validate-episode.mjs episode-001 --stage=quality
```

The starter episode contains empty draft arrays. Production validation will intentionally fail until research, script scenes, and storyboard scenes are completed.

## Publishing policy

All uploads and publishing remain owner-approved. No new workflow in this scaffold automatically publishes to YouTube. Store credentials only in GitHub Actions Secrets; never commit API keys or tokens.
