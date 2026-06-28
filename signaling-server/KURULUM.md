# İkili Sesli Sohbet Uygulaması — Kurulum Kılavuzu

Bu proje 2 parçadan oluşuyor:

1. **signaling-server/** → Sadece iki tarafın birbirini "bulmasını" sağlayan küçük sunucu.
   Ses ve yazı buradan GEÇMEZ, sadece bağlantı bilgisi geçer. Ücretsiz Render.com'a koyacağız.
2. **desktop-app/** → Senin ve arkadaşının açacağı Windows masaüstü uygulaması (Electron).

---

## 1. ADIM: Signaling sunucusunu Render.com'a yükle (ÜCRETSİZ)

1. https://render.com adresine git, GitHub hesabınla ücretsiz kayıt ol.
2. `signaling-server` klasörünü kendi GitHub hesabında yeni bir repo'ya yükle
   (GitHub Desktop kullanabilirsin, kod yazmana gerek yok — sadece dosyaları sürükle).
3. Render'da **"New +" → "Web Service"** seç, GitHub reponu bağla.
4. Ayarlar:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Deploy ettikten sonra Render sana bir adres verecek, örneğin:
   `https://ikili-sohbet-server.onrender.com`
6. Bu adresi not al, başında `https://` yerine `wss://` yazacağız (bir alttaki adımda).

> Not: Render'ın ücretsiz planı, uygulama 15 dakika kullanılmazsa "uyur" ve
> tekrar bağlanırken birkaç saniye gecikme olabilir. Bu normal.

---

## 2. ADIM: Masaüstü uygulamasını ayarla

1. `desktop-app/renderer.js` dosyasını aç.
2. En üstteki şu satırı bul:
   ```js
   const SIGNALING_SERVER_URL = "wss://DEPLOY-ETTIGIN-ADRES-BURAYA.onrender.com";
   ```
3. Render'dan aldığın adresi `wss://` ile başlayacak şekilde yapıştır, örnek:
   ```js
   const SIGNALING_SERVER_URL = "wss://ikili-sohbet-server.onrender.com";
   ```
4. Kaydet.

---

## 3. ADIM: Bilgisayarında çalıştır (test için)

Bilgisayarında [Node.js](https://nodejs.org) kurulu olmalı (LTS sürümü indir, kur).

```bash
cd desktop-app
npm install
npm start
```

Uygulama açılacak. Arkadaşın da kendi bilgisayarında aynı adımları yapmalı
(aynı `renderer.js` dosyasıyla, yani aynı sunucu adresiyle).

---

## 4. ADIM: Windows .exe dosyası oluştur (paylaşmak için)

Uygulamayı arkadaşına kurulum dosyası olarak göndermek istersen:

```bash
cd desktop-app
npm install
npm run build-win
```

Bu işlem birkaç dakika sürer. Bittiğinde `desktop-app/dist/` klasöründe
bir `.exe` kurulum dosyası oluşur. Bu dosyayı arkadaşına gönderebilirsin
(WeTransfer, Google Drive, Discord dosya paylaşımı vb. ile — dosya biraz
büyük olabilir, ~80-150 MB, çünkü Electron Chromium tarayıcısını içinde taşıyor).

---

## Nasıl kullanılır?

1. Sen "Oda Oluştur" butonuna tıkla, sana 6 haneli bir kod gösterilir.
2. Bu kodu arkadaşına (WhatsApp, mesaj vb. ile) gönder.
3. Arkadaşın "Odaya Katıl" kutucuğuna kodu yazıp "Odaya Katıl"a tıklar.
4. Otomatik olarak bağlantı kurulur, sesli konuşmaya başlarsınız.
5. Alt kısımdan yazılı mesaj da gönderebilirsiniz.
6. Gürültü Önleyici / Eko Engelleme / Otomatik Ses Seviyesi kutucukları
   varsayılan olarak açık — bunlar tarayıcı/Chromium'un yerleşik ses
   işleme özellikleri, Discord'un da temelde kullandığı teknolojiyle aynı.

---

## Güvenlik notu

Bu basit haliyle oda kodunu bilen HERKES odaya girebilir (6 haneli kod,
tahmin etmesi zor ama imkansız değil). Sadece ikiniz arasında, düşük riskli
kullanım için yeterli. Daha sıkı güvenlik istersen (şifre, sadece belirli
kişi girebilsin gibi) bunu da ekleyebiliriz, yeter ki söyle.
