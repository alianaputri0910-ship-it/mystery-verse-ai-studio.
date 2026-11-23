# Produksi Episode — Desa Trunyan

## Isi paket
- `short.json`: naskah Shorts 8 adegan, narasi dan prompt visual 9:16.
- `longform.json`: 9 bab narasi dokumenter dan metadata dasar untuk video 16:9.
- `research-notes.md`: fakta, sumber, dan batasan editorial.
- `youtube-metadata.md`: judul, deskripsi, hashtag, tag, dan sumber.

## Shorts
1. Buka GitHub → Actions → **MYSTERY VERSE Video Builder**.
2. Pilih **Run workflow** pada branch `main`.
3. Episode slug: `trunyan`.
4. Jalankan workflow dan tunggu sampai selesai.
5. Unduh artifact `mystery-verse-trunyan-shorts`.
6. Periksa MP4, subtitle, audio, dan metadata sebelum upload.

Hasil yang diharapkan: `output/mystery-verse.mp4`, vertikal 1080x1920, 30 fps, narator id-ID-ArdiNeural rate -10%, opening brand, subtitle per kata.

## Video panjang
1. Buka GitHub → Actions → **MYSTERY VERSE Long-form Builder**.
2. Pilih **Run workflow** pada branch `main`.
3. Jalankan workflow.
4. Unduh artifact `mystery-verse-trunyan-longform`.
5. Periksa durasi aktual, gambar, sinkronisasi narasi, subtitle per kata, dan kualitas audio.

Hasil yang diharapkan: `output/mystery-verse-trunyan-longform.mp4`, horizontal 1920x1080, 30 fps, narator id-ID-ArdiNeural rate -10%. Naskah berisi 9 bab dan sekitar 1.309 kata; durasi final bergantung pada kecepatan TTS.

## Secret wajib
Pastikan secret `POLLINATIONS_API_KEY` tersedia pada Settings → Secrets and variables → Actions. Jangan menempelkan API key ke chat atau commit ke repository.

## Thumbnail
Workflow video panjang menghasilkan `output/longform/images/thumbnail.jpg`. Tambahkan teks thumbnail secara manual di editor grafis agar ejaan dan keterbacaan terjamin:
- Teks utama: **MISTERI DESA TRUNYAN**
- Teks pendamping kecil: **TRADISI MEPASAH**
Jangan gunakan foto jenazah atau visual grafis. Thumbnail harus menggambarkan budaya secara hormat.

## Publikasi
Workflow hanya membuat artifact. Tidak ada upload otomatis ke YouTube pada tahap ini. Pemilik channel harus memeriksa dan mengunggah secara manual. Integrasi YouTube OAuth belum diaktifkan.

## Pemeriksaan fakta sebelum tayang
- Jangan menggeneralisasi mepasah untuk semua warga.
- Sema Wayah, Sema Nguda, dan Sema Bantas harus dijelaskan sesuai fungsi yang diriset.
- Atribusikan klaim aroma Taru Menyan sebagai kepercayaan masyarakat.
- Sebut kisah dewi dan Raja Dalem Solo sebagai legenda.
- AI visuals adalah ilustrasi/rekonstruksi, bukan dokumentasi lapangan.
- Hormati area sakral dan masyarakat adat; hindari thumbnail atau narasi yang mengeksploitasi jenazah.
