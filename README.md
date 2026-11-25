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

## One-click full production

Use GitHub Actions → **MYSTERY VERSE Studio - Full Production** → Run workflow → select `trunyan`. This runs the existing Shorts and long-form production engines in sequence, validates both MP4 files, and uploads a review artifact. Set the repository secret `POLLINATIONS_API_KEY` before running. The workflow does not publish to YouTube; owner review and upload remain required. See [full production guide](workflows/FULL-PRODUCTION.md).


## Produksi episode baru
Tambahkan `episodes/<slug>/short.json` dan `episodes/<slug>/longform.json`, lalu jalankan workflow **MYSTERY VERSE Studio - Full Production** dengan input slug folder tersebut. Lihat [`workflows/FULL-PRODUCTION.md`](workflows/FULL-PRODUCTION.md) untuk skema dan langkah lengkap. Workflow kini tidak mengunci episode ke Trunyan.


## Produksi long-form episode Ourang Medan
Episode baru **Ourang Medan** sudah disiapkan di `episodes/ourang-medan/longform.json`, dengan riset dan sumber di `episodes/ourang-medan/research.md`. Untuk memproduksi video panjang saja, buka Actions → **MYSTERY VERSE - Long-form Production** → Run workflow, lalu isi slug `ourang-medan`. Pastikan secret `POLLINATIONS_API_KEY` tersedia. Hasil MP4 dan bahan review akan diunggah sebagai artifact selama 14 hari. Workflow ini tidak mengunggah video ke YouTube.
