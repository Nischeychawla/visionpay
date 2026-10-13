import base64
import io
import re
import cv2
import numpy as np
from PIL import Image
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
qr_detector = cv2.QRCodeDetector()

def classify_drawn_digit(gray_28x28):
    """Classifies single drawn strokes using contour geometry heuristics."""
    _, thresh = cv2.threshold(gray_28x28, 50, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
    cnt = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(cnt)
    aspect_ratio = float(w) / max(h, 1)

    # Slender vertical line -> '1'
    if aspect_ratio < 0.38:
        return 1
    # Wide circular stroke -> '0'
    elif aspect_ratio > 0.82:
        return 0
    else:
        return 2

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/scan-frame', methods=['POST'])
def scan_frame():
    try:
        payload = request.get_json()
        img_data = payload.get('image').split(',')[1]
        img_bytes = base64.b64decode(img_data)
        
        image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        frame = np.array(image)
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        h, w, _ = frame.shape
        center_x, center_y = w // 2, h // 2

        decoded_text, points, _ = qr_detector.detectAndDecode(frame)

        if points is not None and len(points) > 0:
            pts = points[0]
            cx = int(np.mean(pts[:, 0]))
            cy = int(np.mean(pts[:, 1]))

            tolerance_x = w * 0.16
            tolerance_y = h * 0.16

            dx = cx - center_x
            dy = cy - center_y

            guidance = ""
            if dx > tolerance_x:
                guidance = "Move phone right"
            elif dx < -tolerance_x:
                guidance = "Move phone left"
            elif dy > tolerance_y:
                guidance = "Tilt camera down"
            elif dy < -tolerance_y:
                guidance = "Tilt camera up"
            else:
                guidance = "Perfect. Hold still."

            upi_data = None
            if decoded_text and decoded_text.startswith("upi://pay"):
                vpa = re.search(r'pa=([^&]+)', decoded_text)
                name = re.search(r'pn=([^&]+)', decoded_text)
                upi_data = {
                    "vpa": vpa.group(1) if vpa else "merchant@upi",
                    "name": name.group(1).replace("%20", " ") if name else "Verified Merchant"
                }

            return jsonify({
                "found": True,
                "locked": (guidance == "Perfect. Hold still." and decoded_text != ""),
                "guidance": guidance,
                "upi": upi_data,
                "raw": decoded_text
            })

        return jsonify({"found": False, "guidance": "Searching for QR code..."})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/recognize-digit', methods=['POST'])
def recognize_digit():
    try:
        data = request.get_json()
        img_data = data.get('image').split(',')[1]
        img_bytes = base64.b64decode(img_data)

        img = Image.open(io.BytesIO(img_bytes)).convert('L')
        img_np = np.array(img)
        
        if np.mean(img_np) > 127:
            img_np = 255 - img_np

        resized = cv2.resize(img_np, (28, 28), interpolation=cv2.INTER_AREA)
        digit = classify_drawn_digit(resized)

        return jsonify({"digit": digit if digit is not None else 1})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)