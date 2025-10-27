# WhatsApp Bot menggunakan Baileys

Bot WhatsApp yang dibangun dengan Baileys (WhatsApp Web API).

## 📋 Prerequisites

- Node.js (v16 atau lebih tinggi)
- npm atau yarn
- Akun WhatsApp

## 🚀 Instalasi

1. Clone repository ini
```bash
git clone https://github.com/himanusia/bot-wa.git
cd bot-wa
```

2. Install dependencies
```bash
npm install
```

## 💻 Cara Menggunakan

### Menggunakan QR Code (Default)
```bash
npm run dev
```
Scan QR code yang muncul di terminal menggunakan WhatsApp di smartphone Anda.

### Menggunakan Pairing Code
```bash
npm run dev:pairing
```
Masukkan nomor WhatsApp Anda dan gunakan pairing code yang diberikan.

### Mode Silent (Tanpa Log Verbose)
```bash
npm run dev:silent
npm run dev:pairing:silent
```

## 📁 Struktur File

```
bot-wa/
├── index.ts              # File utama bot
├── baileys_auth_info/    # Folder auth (auto-generated)
├── wa-logs.txt           # File log (auto-generated)
├── package.json
└── README.md
```

## 🔧 Fitur

- ✅ Multi-device support
- ✅ Pairing code authentication
- ✅ QR code authentication
- ✅ Message retry handling
- ✅ Logging dengan Pino
- ✅ Auto reconnect
- ✅ Message read status
- ✅ Typing indicator

## 📝 Development

Script yang tersedia:
- `npm run dev` - Jalankan bot dengan QR code
- `npm run dev:pairing` - Jalankan bot dengan pairing code
- `npm run dev:silent` - Jalankan bot tanpa log verbose
- `npm run dev:pairing:silent` - Pairing code + silent mode
- `npm run build` - Build project TypeScript
- `npm start` - Jalankan bot (production)

## 🛠️ Technologies

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- TypeScript
- Pino (Logger)
- Node.js

## ⚠️ Catatan Penting

- File `baileys_auth_info/` berisi kredensial WhatsApp Anda. **Jangan** commit folder ini ke repository!
- Gunakan bot ini dengan bijak dan patuhi Terms of Service WhatsApp
- Bot ini untuk keperluan edukasi dan development

## 📄 License

ISC

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

## 📧 Contact

Untuk pertanyaan atau saran, silakan buat issue di repository ini.
