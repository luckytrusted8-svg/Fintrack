# Panduan Build APK Android via TWA (Trusted Web Activity)

Fintrack dirancang sebagai Progressive Web App (PWA) lengkap yang dapat langsung di-package menjadi file APK Android native tanpa menulis ulang kode (menggunakan 1 codebase web yang sama).

Tersedia dua opsi resmi dari Google dan Microsoft:

---

## Opsi 1: PWABuilder (Paling Cepat & Mudah)
1. Deploy Fintrack ke hosting HTTPS publik (misalnya Vercel, Netlify, atau Cloudflare Pages).
2. Buka [PWABuilder.com](https://www.pwabuilder.com).
3. Masukkan URL web Fintrack Anda (contoh: `https://fintrack.vercel.app`).
4. PWABuilder akan memvalidasi manifest, service worker, dan icon otomatis (semua konfigurasi sudah siap 100% di project ini).
5. Klik tombol **Package for Android**.
6. Pilih opsi signing:
   - Unduh APK siap install (debug/release) beserta file signing key.
7. Ambil nilai **SHA-256 Fingerprint** dari hasil build PWABuilder, lalu tempelkan ke file:
   `public/.well-known/assetlinks.json`
   (ini memastikan address bar browser hilang total sehingga aplikasi tampil 100% full-screen seperti native app).

---

## Opsi 2: Bubblewrap CLI (Alat Resmi Google Chrome Team)
Jika ingin mem-build APK secara lokal menggunakan command line:

### Prasyarat
- Node.js terinstal
- Java Development Kit (JDK 17+)
- Android Command-line Tools (Android SDK)

### Langkah Pengerjaan
1. Instal Bubblewrap CLI secara global:
   ```bash
   npm i -g @bubblewrap/cli
   ```
2. Inisialisasi konfigurasi dari manifest web:
   ```bash
   bubblewrap init --manifest=https://your-domain.com/manifest.json
   ```
3. Ikuti wizard terminal untuk menentukan Package ID (contoh: `com.fintrack.app`) dan nama aplikasi.
4. Lakukan proses build APK:
   ```bash
   bubblewrap build
   ```
5. File `app-release-signed.apk` akan dihasilkan dan siap di-install langsung di HP Android.
6. Salin fingerprint SHA-256 dari output Bubblewrap ke `public/.well-known/assetlinks.json`.
