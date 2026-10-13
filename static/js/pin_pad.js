const pinModal = document.getElementById("pinModal");
const canvas = document.getElementById("gestureCanvas");
const ctx = canvas.getContext("2d");
const dots = document.querySelectorAll(".pin-indicators .dot");
const cancelPinBtn = document.getElementById("cancelPinBtn");
const clearStrokeBtn = document.getElementById("clearStrokeBtn");

let isDrawing = false;
let enteredPin = [];
const PIN_LENGTH = 4;

window.initPinCanvas = function () {
  const container = canvas.parentElement;
  
  // Explicitly match physical pixel size to parent element
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  
  enteredPin = [];
  updateDots();

  const msg = new SpeechSynthesisUtterance("PIN Pad ready. Draw first digit on screen.");
  window.speechSynthesis.speak(msg);
};

function getCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

function startStroke(e) {
  e.preventDefault();
  isDrawing = true;
  const { x, y } = getCoords(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function moveStroke(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const { x, y } = getCoords(e);
  ctx.lineTo(x, y);
  ctx.stroke();
}

async function finishStroke(e) {
  if (!isDrawing) return;
  isDrawing = false;
  e.preventDefault();

  const dataURL = canvas.toDataURL("image/png");
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear screen immediately for next digit

  try {
    const res = await fetch("/api/recognize-digit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataURL })
    });
    const result = await res.json();
    const digit = result.digit;

    if (digit !== null) {
      enteredPin.push(digit);

      // Silent tactile tick confirming stroke registered (no voice leakage)
      if (navigator.vibrate) navigator.vibrate(60);

      updateDots();

      if (enteredPin.length === PIN_LENGTH) {
        finalizePayment();
      }
    }
  } catch (err) {
    console.error("Digit parsing error", err);
  }
}

function updateDots() {
  dots.forEach((dot, idx) => {
    if (idx < enteredPin.length) {
      dot.classList.add("filled");
    } else {
      dot.classList.remove("filled");
    }
  });
}

function finalizePayment() {
  pinModal.classList.add("hidden");

  const amount = document.getElementById("amountInput").value;
  const payee = document.getElementById("merchantName").innerText;

  if (navigator.vibrate) navigator.vibrate([100, 100, 200]);

  const successUtterance = new SpeechSynthesisUtterance(
    `Payment of ${amount} Rupees to ${payee} successful!`
  );
  window.speechSynthesis.speak(successUtterance);

  alert(`✅ VisionPay: UPI Transfer Complete!\nPaid ₹${amount} to ${payee}`);
  location.reload();
}

// Pointer & Touch Events
canvas.addEventListener("touchstart", startStroke, { passive: false });
canvas.addEventListener("touchmove", moveStroke, { passive: false });
canvas.addEventListener("touchend", finishStroke, { passive: false });

canvas.addEventListener("mousedown", startStroke);
canvas.addEventListener("mousemove", moveStroke);
canvas.addEventListener("mouseup", finishStroke);

cancelPinBtn.addEventListener("click", () => {
  pinModal.classList.add("hidden");
});

clearStrokeBtn.addEventListener("click", () => {
  if (enteredPin.length > 0) {
    enteredPin.pop();
    updateDots();
    if (navigator.vibrate) navigator.vibrate(30);
  }
});