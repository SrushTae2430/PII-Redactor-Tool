import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Tuple

def detect_visual_artifacts(image: Image.Image, page_width: float, page_height: float) -> List[Dict[str, Any]]:
    """
    Scans a document page image using OpenCV to detect signatures, photo portraits, and stamps/seals.
    Returns normalized bounding box coordinates [x, y, width, height] relative to page dimensions.
    """
    artifacts = []
    
    # Convert PIL Image to OpenCV BGR format
    open_cv_image = np.array(image.convert('RGB'))
    img_bgr = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
    img_h, img_w = img_bgr.shape[:2]

    scale_x = page_width / float(img_w)
    scale_y = page_height / float(img_h)

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Signature Detection (Handwritten ink stroke clustering & high aspect ratio contours)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for idx, cnt in enumerate(contours):
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = float(w) / float(h)
        area = w * h
        
        # Signatures typically have high aspect ratios or distinct isolated ink density
        if 500 < area < (img_w * img_h * 0.15) and (aspect_ratio > 1.8 or aspect_ratio < 0.5):
            # Check density (ratio of black pixels in box)
            roi = binary[y:y+h, x:x+w]
            density = cv2.countNonZero(roi) / float(area)
            if 0.05 < density < 0.45:
                norm_x = x * scale_x
                norm_y = y * scale_y
                norm_w = w * scale_x
                norm_h = h * scale_y
                artifacts.append({
                    "id": f"vis_sig_{idx}",
                    "text": "[SIGNATURE]",
                    "type": "SIGNATURE",
                    "category": "VISUAL",
                    "bbox": [round(norm_x, 2), round(norm_y, 2), round(norm_w, 2), round(norm_h, 2)],
                    "confidence": 0.89
                })

    # 2. Photo ID / Face Detection using Haar Cascades or Skin Tone / Rectangular Contour Detection
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    try:
        face_cascade = cv2.CascadeClassifier(face_cascade_path)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        for idx, (fx, fy, fw, fh) in enumerate(faces):
            # Expand box slightly to cover passport photo border
            px = max(0, fx - int(fw * 0.2))
            py = max(0, fy - int(fh * 0.3))
            pw = min(img_w - px, int(fw * 1.4))
            ph = min(img_h - py, int(fh * 1.6))
            
            artifacts.append({
                "id": f"vis_face_{idx}",
                "text": "[PHOTO_ID_PORTRAIT]",
                "type": "PHOTO_ID",
                "category": "VISUAL",
                "bbox": [round(px * scale_x, 2), round(py * scale_y, 2), round(pw * scale_x, 2), round(ph * scale_y, 2)],
                "confidence": 0.92
            })
    except Exception:
        pass

    # 3. Stamp / Seal Detection (Circular or Colored Ink Contours: Red/Blue/Purple)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    # Red/Blue ink range for stamps
    lower_red1 = np.array([0, 70, 50])
    upper_red1 = np.array([10, 255, 255])
    lower_blue = np.array([100, 70, 50])
    upper_blue = np.array([130, 255, 255])

    mask_red = cv2.inRange(hsv, lower_red1, upper_red1)
    mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
    stamp_mask = cv2.bitwise_or(mask_red, mask_blue)

    stamp_contours, _ = cv2.findContours(stamp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for idx, scnt in enumerate(stamp_contours):
        sx, sy, sw, sh = cv2.boundingRect(scnt)
        s_area = sw * sh
        if 800 < s_area < (img_w * img_h * 0.25):
            artifacts.append({
                "id": f"vis_stamp_{idx}",
                "text": "[OFFICIAL_STAMP]",
                "type": "STAMP",
                "category": "VISUAL",
                "bbox": [round(sx * scale_x, 2), round(sy * scale_y, 2), round(sw * scale_x, 2), round(sh * scale_y, 2)],
                "confidence": 0.86
            })

    return artifacts
