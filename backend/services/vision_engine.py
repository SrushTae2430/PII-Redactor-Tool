import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Any

def apply_nms(boxes: List[List[int]], scores: List[float], iou_threshold: float = 0.3) -> List[int]:
    """Applies Non-Maximum Suppression (NMS) to remove duplicate overlapping bounding boxes."""
    if not boxes:
        return []

    x1 = np.array([b[0] for b in boxes])
    y1 = np.array([b[1] for b in boxes])
    x2 = np.array([b[0] + b[2] for b in boxes])
    y2 = np.array([b[1] + b[3] for b in boxes])
    scores = np.array(scores)

    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h

        ovr = inter / (areas[i] + areas[order[1:]] - inter)
        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]

    return keep

def detect_visual_artifacts(image: Image.Image, page_width: float, page_height: float) -> List[Dict[str, Any]]:
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
        
        if 800 < area < (img_w * img_h * 0.10) and (aspect_ratio > 2.2 or aspect_ratio < 0.4):
            roi = binary[y:y+h, x:x+w]
            density = cv2.countNonZero(roi) / float(area)
            if 0.08 < density < 0.35 and h > 12:
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
                    "selected_action": "blackout",
                    "dummy_value": None,
                    "label_tag": "[SIGNATURE]",
                    "active": True
                })

    # 2. Photo ID / Face Detection with Non-Maximum Suppression (NMS)
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    try:
        face_cascade = cv2.CascadeClassifier(face_cascade_path)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(45, 45))
        
        if len(faces) > 0:
            raw_boxes = []
            scores = []
            for (fx, fy, fw, fh) in faces:
                raw_boxes.append([fx, fy, fw, fh])
                scores.append(0.92)

            keep_indices = apply_nms(raw_boxes, scores, iou_threshold=0.3)
            
            for idx in keep_indices:
                fx, fy, fw, fh = raw_boxes[idx]
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
                    "confidence": 0.95,
                    "suggested_action": "blackout",
                    "action": "blackout",
                    "selected_action": "blackout",
                    "dummy_value": None,
                    "label_tag": "[PHOTO]",
                    "active": True
                })
    except Exception:
        pass

    # 3. Official Stamp / Seal Detection (Strict Circularity & Color Mask)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
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
        
        perimeter = cv2.arcLength(scnt, True)
        if perimeter > 0:
            circularity = (4 * np.pi * s_area) / (perimeter * perimeter)
            aspect_ratio = float(sw) / float(sh)
            
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
                    "selected_action": "blackout",
                    "dummy_value": None,
                    "label_tag": "[STAMP]",
                    "active": True
                })

    return artifacts
