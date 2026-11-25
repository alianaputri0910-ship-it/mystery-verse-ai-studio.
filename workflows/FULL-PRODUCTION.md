# Full Production Pipeline — MYSTERY VERSE

Workflow GitHub Actions: **MYSTERY VERSE Studio - Full Production**.

## Menambahkan episode baru
Buat folder baru di `episodes/<slug>/` (slug huruf kecil, angka, dan tanda hubung), lalu isi dua file:

- `short.json`: `slug` harus sama dengan nama folder; `topic`, `opening_visual_prompt`, dan tepat 8 `scenes`. Setiap scene wajib memiliki `beat`, `narration`, dan `visual_prompt`. Objek `youtube` dapat berisi metadata Shorts.
- `longform.json`: `slug` harus sama; isi `title`, `description`, minimal 6 `chapters` dengan `title` dan `narration`. Isi `topic` atau `opening_visual_prompt`. Opsional: `opening_visual_prompt`, `thumbnail_visual_prompt`, `tags`, `hashtags`, serta `visual_prompt` pada setiap bab.

Visual long-form memakai prompt per bab jika tersedia; jika tidak, prompt dokumenter dibuat dari topik dan judul bab. Gaya visual bersama tetap mengikuti `config/visual-style.json` dan `style_lock`.

## Jalankan
1. Pastikan secret repository `POLLINATIONS_API_KEY` tersedia di Settings → Secrets and variables → Actions.
2. Buka Actions → **MYSTERY VERSE Studio - Full Production** → Run workflow.
3. Masukkan slug episode, misalnya `trunyan` atau `kisah-baru`.
4. Unduh artifact `mystery-verse-<slug>-full-production` setelah job selesai.

Pipeline membuat Shorts 9:16 dan long-form 16:9, caption per kata, metadata, serta paket review. Upload/publikasi YouTube tetap menunggu persetujuan manual. Tidak perlu menambah pilihan episode di file workflow; slug akan divalidasi terhadap folder `episodes/<slug>`.
