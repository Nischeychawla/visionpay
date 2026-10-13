const cameraFeed = document.getElementById("cameraFeed");
const instructionText = document.getElementById("instructionText");
const statusBadge = document.getElementById("statusBadge");
const merchantSheet = document.getElementById("merchantSheet");
const merchantName = document.getElementById("merchantName");
const merchantVpa = document.getElementById("merchantVpa");
const captureCanvas = document.getElementById("captureCanvas");
const proceedPayBtn = document.getElementById("proceedPayBtn");

let scanInterval = null;
let lastSpokenText = "";
let audioContext = null;
let speechRecognizer = null;

// Initialize sound context on first tap
document.body.addEventListener("click", () => {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
}, { once: true });

function speak(text, callback) {
  if (text === lastSpokenText) return;
  lastSpokenText = text;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  if (callback) utterance.onend = callback;
  window.speechSynthesis.speak(utterance);
}

function playSonarTone(freq) {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.15);
}

// Voice Command Listener for "YES" or "PAY"
function startVoicePayListener() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = false;
  speechRecognizer.lang = "en-IN";

  speechRecognizer.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("Heard voice command:", transcript);

    if (transcript.includes("yes") || transcript.includes("pay") || transcript.includes("proceed")) {
      speechRecognizer.stop();
      triggerPinModal();
    }
  };

  speechRecognizer.onerror = (e) => console.log("Voice recognizer error:", e);
  speechRecognizer.start();
}

async function startCamera() {
  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }
      });
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    cameraFeed.srcObject = stream;
    cameraFeed.onloadedmetadata = () => cameraFeed.play();

    statusBadge.innerText = "ACTIVE SCANNING";
    speak("VisionPay active. Point your camera toward the counter QR code.");
    scanInterval = setInterval(processFrame, 500);
  } catch (err) {
    console.error(err);
    instructionText.innerText = "Camera access denied. Check permissions.";
    speak("Camera access failed. Please grant permission.");
  }
}

async function processFrame() {
  if (!cameraFeed.videoWidth) return;

  const ctx = captureCanvas.getContext("2d");
  captureCanvas.width = cameraFeed.videoWidth;
  captureCanvas.height = cameraFeed.videoHeight;
  ctx.drawImage(cameraFeed, 0, 0, captureCanvas.width, captureCanvas.height);

  const base64Image = captureCanvas.toDataURL("image/jpeg", 0.6);

  try {
    const res = await fetch("/api/scan-frame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });
    const data = await res.json();

    if (data.found) {
      playSonarTone(data.locked ? 880 : 440);
      instructionText.innerText = data.guidance;

      if (data.locked && data.upi) {
        clearInterval(scanInterval);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        statusBadge.innerText = "QR LOCKED";
        merchantSheet.classList.remove("hidden");
        merchantName.innerText = data.upi.name;
        merchantVpa.innerText = data.upi.vpa;

        speak(`Verified merchant: ${data.upi.name}. Tap button or say YES to draw your PIN.`, () => {
          startVoicePayListener();
        });
      } else {
        speak(data.guidance);
      }
    } else {
      instructionText.innerText = data.guidance;
    }
  } catch (err) {
    console.error("Frame processing failed", err);
  }
}

function triggerPinModal() {
  if (speechRecognizer) {
    try { speechRecognizer.stop(); } catch (e) {}
  }
  document.getElementById("pinModal").classList.remove("hidden");
  window.initPinCanvas();
}

window.addEventListener("load", startCamera);
proceedPayBtn.addEventListener("click", triggerPinModal);