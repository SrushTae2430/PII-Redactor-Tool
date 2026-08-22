import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Any

def detect_visual_artifacts(image: Image.Image, page_width: float, page_height: float) -> List[Dict[str, Any]]:
    """
    Scans document page image for actual physical signatures, photo ID portraits, and official stamps.
    Includes strict circularity and ink color masks to prevent false-positive stamp blocks over text headings.
    """
    artifacts = []
    
    open_cv_image = np.array(image.convert('RGB'))
    img_bgr = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
    img_h, img_w = img_bgr.shape[:2]

    scale_x = page_width / float(img_w)
    scale_y = page_height / float(img_h)

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Signature Detection (Isolated ink stroke clusters with high aspect ratios)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for idx, cnt in enumerate(contours):
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = float(w) / float(h)
        area = w * h
        
        # Signatures require high aspect ratio (handwriting slant) or distinct isolated ink density
        if 800 < area < (img_w * img_h * 0.10) and (aspect_ratio > 2.2 or aspect_ratio < 0.4):
            roi = binary[y:y+h, x:x+w]
            density = cv2.countNonZero(roi) / float(area)
            if 0.08 < density < 0.35:
                # Ensure it's not a horizontal line rule
                if h > 12:
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
                        "confidence": 0.89,
                        "suggested_action": "blackout",
                        "action": "blackout",
                        "dummy_value": "[REDACTED]",
                        "active": True
                    })

    # 2. Photo ID / Face Detection
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    try:
        face_cascade = cv2.CascadeClassifier(face_cascade_path)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        for idx, (fx, fy, fw, fh) in enumerate(faces):
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
                "confidence": 0.92,
                "suggested_action": "blackout",
                "action": "blackout",
                "dummy_value": "[REDACTED]",
                "active": True
            })
    except Exception:
        pass

    # 3. Official Stamp / Seal Detection (Strict Circularity & Colored Ink Bounds)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    # Bright red/purple/blue stamp ink mask
    lower_red = np.array([0, 90, 60])
    upper_red = np.array([10, 255, 255])
    lower_purple = np.array([130, 90, 60])
    upper_purple = np.array([160, 255, 255])

    mask_red = cv2.inRange(hsv, lower_red, upper_red)
    mask_purple = cv2.inRange(hsv, lower_purple, upper_purple)
    stamp_mask = cv2.bitwise_or(mask_red, mask_purple)

    stamp_contours, _ = cv2.findContours(stamp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for idx, scnt in enumerate(stamp_contours):
        sx, sy, sw, sh = cv2.boundingRect(scnt)
        s_area = cv2.contourArea(scnt)
        
        # Calculate circularity
        perimeter = cv2.arcLength(scnt, True)
        if perimeter > 0:
            circularity = (4 * np.pi * s_area) / (perimeter * perimeter)
            aspect_ratio = float(sw) / float(sh)
            
            # Stamps MUST be round/oval (circularity > 0.45, aspect ratio 0.7 - 1.4)
            if 1200 < s_area < (img_w * img_h * 0.20) and circularity > 0.45 and 0.7 < aspect_ratio < 1.4:
                artifacts.append({
                    "id": f"vis_stamp_{idx}",
                    "text": "[OFFICIAL_STAMP]",
                    "type": "STAMP",
                    "category": "VISUAL",
                    "bbox": [round(sx * scale_x, 2), round(sy * scale_y, 2), round(sw * scale_x, 2), round(sh * scale_y, 2)],
                    "confidence": 0.88,
                    "suggested_action": "blackout",
                    "action": "blackout",
                    "dummy_value": "[REDACTED]",
                    "active": True
                })

    return artifacts
