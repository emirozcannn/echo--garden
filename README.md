# 🌱 The Echo Garden

> **"Seed from Speech"** - Bu projede rastgelelik sayısal değildir. Sizin ilk cümlenizdir.  
> "Merhaba Dünya" derseniz farklı, "Hello World" derseniz tamamen farklı bir evren oluşur.

**Ses verisini analiz ederek gerçek zamanlı, prosedürel ve hiper-gerçekçi bir 3D ekosistem oluşturan web motoru.**

*"Bir podcast kaydını yüklediğinde, sana o sohbetin 'ormanını' veren araç."*

![Echo Garden Banner](preview.png)

---

## 🎯 Vizyon

Echo Garden, ses verilerini canlı, nefes alan dijital ekosistemlere dönüştürür:

- 🎙️ **Podcast'ler** → Konuşmanın ormanı
- 🎵 **Müzik** → Melodinin bahçesi  
- 🎮 **Canlı Yayınlar** → Sesinizle büyüyen bonsai
- 🧘 **ASMR/Meditasyon** → Huzurun vadisi

---

## ✨ Özellikler

### 🧬 Duygu Tohumlaması (Sentiment-Based Flora)

Sadece sesin yüksekliği değil, **ne hissettirildiği** doğayı şekillendirir:

| Duygu | Flora | Atmosfer |
|-------|-------|----------|
| 😤 **Öfke/Tartışma** | Dikenli bitkiler, volkanik kayalar | Kırmızı gökyüzü, keskin rüzgar |
| 😌 **Sakinlik/ASMR** | Yosunlu taşlar, söğüt ağaçları | Mavi-mor tonlar, ateş böcekleri |
| 😄 **Kahkaha/Neşe** | Parlak çiçekler, kelebekler | Polen patlamaları, gökkuşağı |
| 😢 **Hüzün** | Solgun yapraklar, sis | Gri tonlar, yağmur damlaları |
| 🤔 **Düşünce** | Kristal formasyonlar | Derin mavi, yıldızlar |

### 🎛️ Spektral Biyoloji (Audio-Reactive Growth)

```
Bass (20-250Hz)    → Gövde kalınlığı, kök derinliği, yer sarsıntısı
Mids (250-2kHz)    → Dal yapısı, büyüme hızı
Treble (2k-20kHz)  → Yaprak titremesi, rüzgar şiddeti
Sessizlik          → Doğanın nefes aldığı anlar
```

### 🌍 Mevsimsel Akış (Timeline Visualization)

1 saatlik podcast = 4 mevsim deneyimi:

```
[0:00-15:00]  🌸 İlkbahar - Giriş, tanışma
[15:00-30:00] ☀️ Yaz - Tartışma, enerji
[30:00-45:00] 🍂 Sonbahar - Olgunlaşma
[45:00-60:00] ❄️ Kış - Vedalaşma, kapanış
```

### 🎨 Prosedürel Generasyon

- **L-System Ağaçlar** - Matematiksel olarak büyüyen organik yapılar
- **Voronoi Çiçekler** - Her seferinde benzersiz petal düzenleri
- **Perlin Arazi** - Sonsuz, tekrarsız topografya
- **Partikül Sistemleri** - Polen, ateş böceği, yağmur, kar

---

## 🚀 Hızlı Başlangıç

```bash
# Klonla
git clone https://github.com/emirozcannn/echo--garden.git
cd echo--garden

# Kur
npm install

# Başlat
npm run dev
```

Tarayıcıda `http://localhost:5173` adresine git ve mikrofonu aç!

### 🔧 Spotify Entegrasyonu (Opsiyonel)

```bash
# .env dosyası oluştur
cp .env.example .env

# Spotify Developer Dashboard'dan Client ID al
# https://developer.spotify.com/dashboard
```

---

## 🎮 Kullanım Modları

### 1. 🎤 Canlı Mikrofon
Konuşurken gerçek zamanlı bahçe oluşur.

### 2. 📁 Dosya Yükleme
MP3/WAV dosyası yükle, tüm timeline'ı görselleştir.

### 3. 🔗 URL Stream
Spotify/YouTube URL'si ile canlı analiz.

### 4. 📺 OBS Widget
Twitch/YouTube yayınları için overlay.

---

## 🛠️ Teknolojiler

| Katman | Teknoloji | Amaç |
|--------|-----------|------|
| 🎨 3D Render | Three.js + R3F | WebGL sahne yönetimi |
| 🎵 Ses Analizi | Meyda.js | Feature extraction |
| 🧠 Duygu AI | TensorFlow.js | Sentiment classification |
| ✨ Efektler | GLSL Shaders | Su, rüzgar, parıltı |
| 🎛️ UI | React + Tailwind | Kontrol paneli |
| 📦 Build | Vite | Hızlı development |

---

## 📁 Proje Yapısı

```
echo-garden/
├── src/
│   ├── engine/
│   │   ├── AudioAnalyzer.ts      # Ses analizi motoru
│   │   ├── SentimentEngine.ts    # Duygu sınıflandırma
│   │   ├── FloraGenerator.ts     # Prosedürel bitki üretimi
│   │   ├── SeasonManager.ts      # Mevsim geçişleri
│   │   └── ParticleSystem.ts     # Partikül efektleri
│   ├── components/
│   │   ├── Garden.tsx            # 3D sahne
│   │   ├── Tree.tsx              # L-System ağaçlar
│   │   ├── Flower.tsx            # Voronoi çiçekler
│   │   ├── Terrain.tsx           # Perlin arazi
│   │   ├── Sky.tsx               # Dinamik gökyüzü
│   │   └── Particles.tsx         # Atmosferik efektler
│   ├── shaders/
│   │   ├── wind.glsl             # Rüzgar simülasyonu
│   │   ├── water.glsl            # Su yansımaları
│   │   └── glow.glsl             # Biyolüminesans
│   ├── hooks/
│   │   ├── useAudio.ts           # Ses hook'u
│   │   └── useGarden.ts          # Bahçe state yönetimi
│   └── utils/
│       ├── lsystem.ts            # L-System algoritması
│       ├── voronoi.ts            # Voronoi diyagramı
│       └── perlin.ts             # Perlin noise
├── public/
└── package.json
```

---

## 🎯 Sektörel Kullanım

### 📺 Twitch/YouTube Yayıncıları
- Sesinizle büyüyen canlı bonsai widget'ı
- Chat entegrasyonu: 💧 = su, ☀️ = güneş

### 🎙️ Podcast Videolaştırma
- Ses dosyasından 4K doğa videosu render
- Spotify video podcast desteği

### 🎵 Lofi/Müzik Kanalları
- Sonsuz, müziğe reaktif manzaralar
- Her şarkıda yeni bir dünya

### 🧘 Meditasyon/Wellness
- Nefes egzersizlerine eşlik eden görsel
- ASMR için huzurlu ortamlar

---

## 🔧 API Referansı

```typescript
// Bahçe oluştur
const garden = new EchoGarden({
  audioSource: 'microphone' | 'file' | 'stream',
  style: 'forest' | 'zen' | 'tropical' | 'arctic',
  quality: 'low' | 'medium' | 'high' | 'ultra'
});

// Ses kaynağı bağla
await garden.connect(audioElement);

// Özel tohum ile başlat
garden.seed("Merhaba Dünya"); // Benzersiz evren

// Event dinle
garden.on('bloom', (flower) => console.log('Çiçek açtı!'));
garden.on('seasonChange', (season) => console.log(season));
```

---

## 🎨 Özelleştirme

### Tema Oluştur

```typescript
const myTheme = {
  name: 'Cyberpunk Forest',
  palette: {
    anger: ['#ff0055', '#ff00ff'],
    calm: ['#00ffff', '#0055ff'],
    joy: ['#ffff00', '#00ff00']
  },
  flora: {
    trees: ['neon_pine', 'chrome_willow'],
    flowers: ['hologram_rose', 'laser_lily']
  }
};

garden.applyTheme(myTheme);
```

---

## 🤝 Katkıda Bulunma

1. Fork et
2. Feature branch oluştur (`git checkout -b feature/amazing-flora`)
3. Commit et (`git commit -m 'feat: Add crystal mushrooms'`)
4. Push et (`git push origin feature/amazing-flora`)
5. Pull Request aç

### Katkı Fikirleri
- 🍄 Yeni bitki türleri
- 🌈 Yeni temalar
- 🎵 Ses analizi iyileştirmeleri
- 🌍 Yeni biome'lar

---

## 📜 Lisans

MIT License - Özgürce kullan, değiştir, dağıt!

---

## � Geliştirme Yol Haritası

Detaylı yol haritası için [ROADMAP.md](ROADMAP.md) dosyasına bakın.

### ✅ Tamamlanan
- Post-processing efektleri (Bloom, SSAO, DOF)
- Meyda.js gelişmiş ses analizi
- TensorFlow.js duygu tanıma
- 16 farklı bitki türü
- Büyüme animasyon sistemi
- Ses-görsel eşleme sistemi

### 🚧 Devam Eden
- Volumetrik bulutlar
- Hava durumu sistemi (yağmur, kar, sis)
- Su yüzeyi simülasyonu
- Export sistemi (4K screenshot, video)
- Spotify entegrasyonu
- YouTube entegrasyonu

### 📋 Yakında
- WebXR VR/AR desteği
- Çoklu kullanıcı bahçeleri
- Neural style transfer
- Marketplace ve premium özellikler

---

## �👤 Geliştirici

**Emir Özcan**
- GitHub: [@emirozcannn](https://github.com/emirozcannn)
- Website: [emirozcan.com](http://emirozcan.com)

---

<div align="center">

### 🌱 "Sesiniz, tohumunuzdur. Her kelime, bir yaprak."

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!

</div>
