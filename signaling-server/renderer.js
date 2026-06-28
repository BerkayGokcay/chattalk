// ====== AYARLAR ======
// Render.com'a (veya başka bir yere) deploy ettikten sonra
// signaling sunucunun adresini buraya yaz. Örn: "wss://benim-sohbetim.onrender.com"
const SIGNALING_SERVER_URL = "wss://DEPLOY-ETTIGIN-ADRES-BURAYA.onrender.com";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ====== ELEMENTLER ======
const screenStart = document.getElementById("screen-start");
const screenChat = document.getElementById("screen-chat");

const btnCreate = document.getElementById("btn-create");
const btnJoin = document.getElementById("btn-join");
const inputCode = document.getElementById("input-code");
const roomCodeDisplay = document.getElementById("room-code-display");
const roomCodeText = document.getElementById("room-code-text");
const waitingStatus = document.getElementById("waiting-status");
const startError = document.getElementById("start-error");

const connectionDot = document.getElementById("connection-dot");
const connectionText = document.getElementById("connection-text");
const btnLeave = document.getElementById("btn-leave");

const btnMic = document.getElementById("btn-mic");
const micLabel = document.getElementById("mic-label");
const toggleNoise = document.getElementById("toggle-noise");
const toggleEcho = document.getElementById("toggle-echo");
const toggleGain = document.getElementById("toggle-gain");
const volumeSlider = document.getElementById("volume-slider");

const messagesEl = document.getElementById("messages");
const inputMessage = document.getElementById("input-message");
const btnSend = document.getElementById("btn-send");

const remoteAudio = document.getElementById("remote-audio");

// ====== DURUM ======
let ws = null;
let pc = null;
let dataChannel = null;
let localStream = null;
let myRole = null; // "host" | "guest"
let roomCode = null;
let micMuted = false;

// ====== YARDIMCI: Ekran geçişi ======
function showChatScreen() {
  screenStart.classList.add("hidden");
  screenChat.classList.remove("hidden");
}

function showError(msg) {
  startError.textContent = msg;
  startError.classList.remove("hidden");
}

function setConnectionState(state) {
  // state: "connecting" | "connected" | "disconnected"
  connectionDot.className = "dot " + state;
  if (state === "connected") connectionText.textContent = "Bağlandı";
  else if (state === "connecting") connectionText.textContent = "Bağlanılıyor...";
  else connectionText.textContent = "Bağlantı kesildi";
}

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ====== SIGNALING SUNUCUSUNA BAĞLAN ======
function connectSignaling() {
  ws = new WebSocket(SIGNALING_SERVER_URL);

  ws.onopen = () => {
    console.log("Signaling sunucusuna bağlandı");
  };

  ws.onerror = () => {
    showError("Sunucuya bağlanılamadı. SIGNALING_SERVER_URL adresini kontrol et.");
  };

  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "room-created":
        roomCode = msg.code;
        roomCodeText.textContent = roomCode;
        roomCodeDisplay.classList.remove("hidden");
        break;

      case "joined":
        roomCode = msg.code;
        waitingStatus.textContent = "Odaya katıldın, bağlantı kuruluyor...";
        roomCodeDisplay.classList.remove("hidden");
        await setupPeerConnection();
        // Guest, ses akışını ekledikten sonra host'tan teklif (offer) bekler
        break;

      case "peer-joined":
        // Host tarafı: arkadaş katıldı, WebRTC teklifini biz başlatıyoruz
        await setupPeerConnection();
        await createOffer();
        break;

      case "signal":
        await handleSignal(msg.data);
        break;

      case "peer-left":
        addMessage("Arkadaşın ayrıldı.", "system");
        setConnectionState("disconnected");
        break;

      case "error":
        showError(msg.message);
        break;
    }
  };
}

// ====== WEBRTC KURULUMU ======
async function getLocalStream() {
  const constraints = {
    audio: {
      echoCancellation: toggleEcho.checked,
      noiseSuppression: toggleNoise.checked,
      autoGainControl: toggleGain.checked,
    },
    video: false,
  };
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  return localStream;
}

async function setupPeerConnection() {
  setConnectionState("connecting");

  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Mikrofon akışını al ve bağlantıya ekle
  await getLocalStream();
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  // Karşı taraftan ses gelince oynat
  pc.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      send({ type: "signal", data: { kind: "ice", candidate: event.candidate } });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      setConnectionState("connected");
      addMessage("Bağlantı kuruldu, konuşabilirsiniz!", "system");
    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      setConnectionState("disconnected");
    }
  };

  // Yazılı mesaj kanalı (host taraf oluşturur, guest gelen kanalı dinler)
  if (myRole === "host") {
    dataChannel = pc.createDataChannel("chat");
    setupDataChannel();
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }

  showChatScreen();
}

function setupDataChannel() {
  dataChannel.onmessage = (event) => {
    addMessage(event.data, "them");
  };
  dataChannel.onopen = () => {
    console.log("Mesaj kanalı açık");
  };
}

async function createOffer() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  send({ type: "signal", data: { kind: "offer", sdp: offer } });
}

async function handleSignal(data) {
  if (data.kind === "offer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ type: "signal", data: { kind: "answer", sdp: answer } });
  } else if (data.kind === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  } else if (data.kind === "ice") {
    try {
      await pc.addIceCandidate(data.candidate);
    } catch (e) {
      console.warn("ICE eklenemedi:", e);
    }
  }
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// ====== BUTON OLAYLARI: Başlangıç ekranı ======
btnCreate.addEventListener("click", () => {
  myRole = "host";
  startError.classList.add("hidden");
  connectSignaling();
  ws.onopen = () => {
    send({ type: "create-room" });
  };
});

btnJoin.addEventListener("click", () => {
  const code = inputCode.value.trim();
  if (code.length !== 6) {
    showError("6 haneli oda kodunu doğru gir.");
    return;
  }
  myRole = "guest";
  startError.classList.add("hidden");
  connectSignaling();
  ws.onopen = () => {
    send({ type: "join-room", code });
  };
});

// ====== BUTON OLAYLARI: Sohbet ekranı ======
btnMic.addEventListener("click", () => {
  micMuted = !micMuted;
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => (track.enabled = !micMuted));
  }
  btnMic.classList.toggle("muted", micMuted);
  micLabel.textContent = micMuted ? "Mikrofon Kapalı" : "Mikrofon Açık";
});

volumeSlider.addEventListener("input", () => {
  remoteAudio.volume = volumeSlider.value / 100;
});

btnSend.addEventListener("click", sendMessage);
inputMessage.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = inputMessage.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== "open") return;
  dataChannel.send(text);
  addMessage(text, "me");
  inputMessage.value = "";
}

btnLeave.addEventListener("click", () => {
  if (pc) pc.close();
  if (ws) ws.close();
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  location.reload();
});

// Not: Gürültü önleyici / eko engelleme / otomatik ses seviyesi ayarları
// sadece bağlantı KURULMADAN ÖNCE değiştirilirse etkili olur, çünkü
// bu ayarlar mikrofon akışı alınırken (getUserMedia) belirlenir.
