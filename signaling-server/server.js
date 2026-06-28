// Basit WebRTC Signaling Sunucusu
// Bu sunucu SES veya YAZI taşımaz, sadece iki taraf birbirini bulup
// doğrudan bağlantı (P2P) kurana kadar "tanıştırma" mesajlarını iletir.

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Signaling server calisiyor.\n');
});

const wss = new WebSocket.Server({ server });

// roomCode -> { host: ws, guest: ws }
const rooms = new Map();

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function generateCode() {
  // 6 haneli, okunabilir oda kodu
  return Math.floor(100000 + Math.random() * 900000).toString();
}

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.role = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }

    switch (msg.type) {
      case 'create-room': {
        let code = generateCode();
        while (rooms.has(code)) code = generateCode();
        rooms.set(code, { host: ws, guest: null });
        ws.roomCode = code;
        ws.role = 'host';
        send(ws, { type: 'room-created', code });
        break;
      }

      case 'join-room': {
        const code = msg.code;
        const room = rooms.get(code);
        if (!room) {
          send(ws, { type: 'error', message: 'Oda bulunamadi. Kodu kontrol et.' });
          return;
        }
        if (room.guest) {
          send(ws, { type: 'error', message: 'Bu odada zaten 2 kisi var.' });
          return;
        }
        room.guest = ws;
        ws.roomCode = code;
        ws.role = 'guest';
        send(ws, { type: 'joined', code });
        // Host'a haber ver, WebRTC teklifini (offer) o baslatacak
        send(room.host, { type: 'peer-joined' });
        break;
      }

      // WebRTC SDP / ICE mesajlarini diger tarafa aktar
      case 'signal': {
        const code = ws.roomCode;
        const room = rooms.get(code);
        if (!room) return;
        const other = ws.role === 'host' ? room.guest : room.host;
        send(other, { type: 'signal', data: msg.data });
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    const code = ws.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    const other = ws.role === 'host' ? room.guest : room.host;
    send(other, { type: 'peer-left' });

    // Oda bos kaldiysa temizle
    if (ws.role === 'host') {
      rooms.delete(code);
    } else {
      room.guest = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server ${PORT} portunda calisiyor`);
});
