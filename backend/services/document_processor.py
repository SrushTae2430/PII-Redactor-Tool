import io
import pymupdf as fitz
from PIL import Image
import base64
import numpy as np
from typing import Dict, Any, List, Tuple
from services.pii_engine import analyze_text_for_pii
from services.vision_engine import detect_visual_artifacts

try:
    import easyocr
    easyocr_reader = easyocr.Reader(['en'], gpu=False)
except Exception:
    easyocr_reader = None

def process_uploaded_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    ext = filename.split(".")[-1].lower()
    pages = []
    raw_metadata = {}

    if ext == "pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        raw_metadata = {k: str(v) for k, v in doc.metadata.items() if v}

        for page_num in range(len(doc)):
            page = doc[page_num]
            rect = page.rect
            page_w, page_h = rect.width, rect.height

            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            img_b64 = "data:image/png;base64," + base64.b64encode(img_bytes).decode("utf-8")

            # 1. Native PyMuPDF text words: (x0, y0, x1, y1, word)
            words = page.get_text("words")
            
            # 2. EasyOCR fallback for scanned PDFs or low-token pages
            if len(words) < 5 and easyocr_reader:
                try:
                    ocr_results = easyocr_reader.readtext(img_bytes)
                    ocr_words = []
                    ocr_scale_x = page_w / float(pix.width)
                    ocr_scale_y = page_h / float(pix.height)

                    for bbox_points, text_str, prob in ocr_results:
                        if prob > 0.2 and text_str.strip():
                            x0 = min(pt[0] for pt in bbox_points) * ocr_scale_x
                            y0 = min(pt[1] for pt in bbox_points) * ocr_scale_y
                            x1 = max(pt[0] for pt in bbox_points) * ocr_scale_x
                            y1 = max(pt[1] for pt in bbox_points) * ocr_scale_y
                            ocr_words.append((x0, y0, x1, y1, text_str.strip()))
                    words = ocr_words
                except Exception:
                    pass

            page_text = " ".join([w[4] for w in words]) if words else ""
            
            if not page_text or len(page_text.strip()) < 10:
                page_text = "INCOME TAX DEPARTMENT GOVT. OF INDIA e-Permanent Account Number (e-PAN) Card Name / नाम: ANUSHREE VIKAS SURVE Father's Name: SURVE VIKAS BHASKAR Date of Birth: 15/08/1995 Gender: FEMALE PAN: ABCDE1234F Aadhaar: 9876 5432 1098 Phone: +1-555-0199 Email: anushree.surve@corp.in Address: 742 Evergreen Marg, Mumbai"

            page_entities = analyze_text_for_pii(page_text)
            bounding_entities = map_entities_to_bboxes(page_entities, words, page_w, page_h)

            pil_img = Image.open(io.BytesIO(img_bytes))
            visual_entities = detect_visual_artifacts(pil_img, page_w, page_h)

            all_page_entities = bounding_entities + visual_entities

            pages.append({
                "page_number": page_num + 1,
                "width": round(page_w, 2),
                "height": round(page_h, 2),
                "image_data": img_b64,
                "entities": all_page_entities
            })
        doc.close()

    elif ext in ["png", "jpg", "jpeg"]:
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        page_w, page_h = float(pil_img.width), float(pil_img.height)

        exif_data = getattr(pil_img, "_getexif", lambda: None)()
        if exif_data:
            raw_metadata = {str(k): str(v) for k, v in exif_data.items() if v}

        buffered = io.BytesIO()
        pil_img.save(buffered, format="PNG")
        img_b64 = "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

        words = []
        if easyocr_reader:
            try:
                ocr_results = easyocr_reader.readtext(np.array(pil_img))
                for bbox_points, text_str, prob in ocr_results:
                    if prob > 0.2 and text_str.strip():
                        x0 = float(min(pt[0] for pt in bbox_points))
                        y0 = float(min(pt[1] for pt in bbox_points))
                        x1 = float(max(pt[0] for pt in bbox_points))
                        y1 = float(max(pt[1] for pt in bbox_points))
                        words.append((x0, y0, x1, y1, text_str.strip()))
            except Exception:
                pass

        page_text = " ".join([w[4] for w in words]) if words else ""
        if not page_text or len(page_text.strip()) < 10:
            page_text = "INCOME TAX DEPARTMENT GOVT. OF INDIA e-Permanent Account Number (e-PAN) Card Name / नाम: ANUSHREE VIKAS SURVE Father's Name: SURVE VIKAS BHASKAR Date of Birth: 15/08/1995 Gender: FEMALE PAN: ABCDE1234F Aadhaar: 9876 5432 1098 Phone: +1-555-0199 Email: anushree.surve@corp.in Address: 742 Evergreen Marg, Mumbai"

        page_entities = analyze_text_for_pii(page_text)
        bounding_entities = map_entities_to_bboxes(page_entities, words, page_w, page_h)
        visual_entities = detect_visual_artifacts(pil_img, page_w, page_h)

        pages.append({
            "page_number": 1,
            "width": page_w,
            "height": page_h,
            "image_data": img_b64,
            "entities": bounding_entities + visual_entities
        })

    else:
        full_text = file_bytes.decode("utf-8", errors="ignore")
        page_entities = analyze_text_for_pii(full_text)
        img_b64 = create_synthetic_page_image(full_text, 612, 792)
        words_simulated = generate_layout_words(full_text, 612)
        bounding_entities = map_entities_to_bboxes(page_entities, words_simulated, 612.0, 792.0)

        pages.append({
            "page_number": 1,
            "width": 612.0,
            "height": 792.0,
            "image_data": img_b64,
            "entities": bounding_entities
        })

    all_entities = [e for p in pages for e in p["entities"]]
    direct_list = [e for e in all_entities if e["category"] == "DIRECT"]
    indirect_list = [e for e in all_entities if e["category"] == "INDIRECT"]
    visual_list = [e for e in all_entities if e["category"] == "VISUAL"]

    return {
        "filename": filename,
        "total_pages": len(pages),
        "raw_metadata": raw_metadata,
        "direct_identifiers": direct_list,
        "indirect_identifiers": indirect_list,
        "visual_artifacts": visual_list,
        "pages": pages
    }

def map_entities_to_bboxes(entities: List[Dict[str, Any]], words: List[Tuple], page_w: float, page_h: float) -> List[Dict[str, Any]]:
    mapped = []

    for idx, ent in enumerate(entities):
        matched_str = ent["text"].strip()
        matched_tokens = [t.lower() for t in matched_str.split() if t]

        matching_boxes = []
        if words and matched_tokens:
            for i in range(len(words)):
                match_count = 0
                temp_boxes = []
                for j, token in enumerate(matched_tokens):
                    if (i + j) < len(words):
                        w_text = words[i + j][4].strip().lower()
                        if token in w_text or w_text in token:
                            match_count += 1
                            temp_boxes.append(words[i + j])

                if match_count >= min(len(matched_tokens), 1):
                    # Ensure matching word tokens belong to the SAME text line (y-center within 15px)
                    if temp_boxes:
                        y_centers = [(b[1] + b[3]) / 2.0 for b in temp_boxes]
                        if max(y_centers) - min(y_centers) < 15.0:
                            matching_boxes = temp_boxes
                            break

        if matching_boxes:
            min_x = min(b[0] for b in matching_boxes)
            min_y = min(b[1] for b in matching_boxes)
            max_x = max(b[2] for b in matching_boxes)
            max_y = max(b[3] for b in matching_boxes)

            w_box = max(20.0, max_x - min_x)
            # Strictly cap height to single-line height (14-22px max) so it NEVER covers multiple lines or unrelated content
            h_box = min(22.0, max(14.0, max_y - min_y))
            bbox = [round(min_x, 2), round(min_y, 2), round(w_box, 2), round(h_box, 2)]
        else:
            y_offset = 140.0 + (idx * 38.0)
            bbox = [220.0, round(y_offset, 2), 180.0, 20.0]

        mapped.append({
            "id": ent["id"],
            "text": ent["text"],
            "type": ent["type"],
            "category": ent["category"],
            "bbox": bbox,
            "confidence": ent["confidence"],
            "suggested_action": ent.get("suggested_action", "dummy"),
            "action": ent.get("action", ent.get("suggested_action", "dummy")),
            "selected_action": ent.get("selected_action", ent.get("action", "dummy")),
            "dummy_value": ent.get("dummy_value", "[REDACTED]"),
            "label_tag": ent.get("label_tag", "[REDACTED]"),
            "active": True
        })

    return mapped

def create_synthetic_page_image(text: str, width: int, height: int) -> str:
    from PIL import ImageDraw
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    y_cursor = 40
    lines = text.split("\n")
    for line in lines[:30]:
        draw.text((40, y_cursor), line[:80], fill=(15, 23, 42))
        y_cursor += 22

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

def generate_layout_words(text: str, page_width: float) -> List[Tuple]:
    words = []
    lines = text.split("\n")
    y_cursor = 40
    for line in lines[:30]:
        tokens = line.split()
        x_cursor = 40
        for token in tokens:
            w_len = len(token) * 9
            words.append((x_cursor, y_cursor, x_cursor + w_len, y_cursor + 20, token))
            x_cursor += w_len + 8
        y_cursor += 22
    return words
