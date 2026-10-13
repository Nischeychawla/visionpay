# VisionPay — Inclusive Spatial Audio & Eyes-Free Gesture UPI Interface

> Built for **Vortex 2K26** under the **Deep Tech & Public Infrastructure** Track.

---

## 📌 Problem Statement
India's digital payment ecosystem processes hundreds of millions of Unified Payments Interface (UPI) transactions daily. However, visually impaired citizens face severe digital and physical exclusion at retail checkout counters:

1. **Viewfinder Alignment Blindspot:** Screen readers and TalkBack tools cannot guide a non-sighted individual to orient and align a mobile camera with a static counter QR stand in 3D physical space.
2. **The Shoulder-Surfing Dilemma:** Modern smartphones feature smooth, buttonless glass. Non-sighted users cannot locate numeric boundaries without tactile markers. Using speech-to-text or screen-readers for secret 4- or 6-digit UPI PINs exposes their credentials to nearby bystanders.

---

## 💡 Solution: VisionPay
**VisionPay** transforms standard mobile browsers into an accessible payment terminal combining real-time computer vision, directional acoustic radar, and silent gesture-based input:

- **Spatial Audio Guidance & Sonar Radar:** Continuously computes horizontal and vertical centroid offsets ($\Delta x, \Delta y$) of QR finder patterns using OpenCV. It provides real-time directional voice commands (*"Move phone left"*, *"Tilt camera up"*) and pitch-shifting sonar frequencies (440 Hz up to 880 Hz) that lock when the code is centered.
- **Merchant VPA Verification:** Automatically parses deep-link parameters (`pa`, `pn`) to announce the registered merchant's name and VPA before any transaction can be staged.
- **Dual Confirmation Channels:** Staging can be confirmed either by tapping a high-contrast action button or via hands-free voice intent (*"Say YES to Pay"* powered by the Web Speech Recognition API).
- **Eyes-Free Gesture PIN Canvas:** A full-screen drawing modal where users draw numeric digits (0–9) anywhere on the display. Each drawn stroke is classified server-side and confirmed strictly through silent tactile vibration pulses (`navigator.vibrate`)—never spoken aloud—preventing acoustic and visual credential leakage.

---

## 🛠️ Tech Stack & System Architecture

### Core Technologies
- **Backend & Computer Vision:** Python, Flask, OpenCV (`cv2.QRCodeDetector`), NumPy, Pillow
- **Frontend & UX:** Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3 (WCAG AAA High Contrast compliant)
- **Assistive Browser APIs:** 
  - `SpeechSynthesis` & `SpeechRecognition` (Web Speech API)
  - `AudioContext` Oscillator Nodes (Web Audio API for real-time sonar)
  - `navigator.vibrate` (Vibration API for silent PIN haptics)
  - `navigator.mediaDevices.getUserMedia` (Environment camera access)

### Architecture Pipeline
```text
[Mobile Camera Stream]
          │
          ▼
[OpenCV Centroid Tracker (Python)]
(Calculates Δx, Δy vs Center Frame)
          │
    ┌─────┴────────────────┐
    ▼
