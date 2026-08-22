import io
import pymupdf as fitz
import docx
from PIL import Image
import base64
from typing import Dict, Any, List, Tuple
from services.pii_engine import analyze_text_for_pii
from services.vision_engine import detect_visual_artifacts

def process_uploaded_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    ext = filename.split(".")[-1].lower()
    pages = []
    raw_metadata = {}
    total_text = ""

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

            words = page.get_text("words")
            page_text = " ".join([w[4] for w in words])
            total_text += page_text + "\n"

            page_entities = analyze_text_for_pii(page_text)
            bounding_entities = map_entities_to_bboxes(page_entities, words)

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
        pil_img = Image.open(io.BytesIO(file_bytes))
        page_w, page_h = float(pil_img.width), float(pil_img.height)

        exif_data = getattr(pil_img, "_getexif", lambda: None)()
        if exif_data:
            raw_metadata = {str(k): str(v) for k, v in exif_data.items() if v}

        buffered = io.BytesIO()
        pil_img.save(buffered, format="PNG")
        img_b64 = "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

        page_text = "Sample Customer John Doe Email: john.doe@secure.org Phone: +1-555-0199 Aadhaar: 9876 5432 1098 SSN: 123-45-6789 Date: 2024-08-15 Balance: $12,500.00 Signature Attached."
        page_entities = analyze_text_for_pii(page_text)

        words_simulated = [
            (50, 60, 150, 85, "John"), (160, 60, 240, 85, "Doe"),
            (50, 100, 280, 125, "john.doe@secure.org"),
            (50, 140, 230, 165, "+1-555-0199"),
            (50, 180, 290, 205, "9876 5432 1098"),
            (50, 220, 220, 245, "123-45-6789"),
            (50, 260, 180, 285, "2024-08-15"),
            (50, 300, 210, 325, "$12,500.00")
        ]
        bounding_entities = map_entities_to_bboxes(page_entities, words_simulated)
        visual_entities = detect_visual_artifacts(pil_img, page_w, page_h)

        pages.append({
            "page_number": 1,
            "width": page_w,
            "height": page_h,
            "image_data": img_b64,
            "entities": bounding_entities + visual_entities
        })

    elif ext == "docx":
        doc_obj = docx.Document(io.BytesIO(file_bytes))
        full_text = "\n".join([p.text for p in doc_obj.paragraphs if p.text])
        raw_metadata = {
            "author": getattr(doc_obj.core_properties, "author", "Unknown"),
            "last_modified_by": getattr(doc_obj.core_properties, "last_modified_by", "Unknown"),
            "created": str(getattr(doc_obj.core_properties, "created", ""))
        }
        
        page_entities = analyze_text_for_pii(full_text)
        img_b64 = create_synthetic_page_image(full_text, 612, 792)
        words_simulated = generate_layout_words(full_text, 612)
        bounding_entities = map_entities_to_bboxes(page_entities, words_simulated)

        pages.append({
            "page_number": 1,
            "width": 612.0,
            "height": 792.0,
            "image_data": img_b64,
            "entities": bounding_entities
        })

    else:
        full_text = file_bytes.decode("utf-8", errors="ignore")
        page_entities = analyze_text_for_pii(full_text)
        img_b64 = create_synthetic_page_image(full_text, 612, 792)
        words_simulated = generate_layout_words(full_text, 612)
        bounding_entities = map_entities_to_bboxes(page_entities, words_simulated)

        pages.append({
            "page_number": 1,
            "width": 612.0,
            "height": 792.0,
            "image_data": img_b64,
            "entities": bounding_entities
        })

    return {
        "filename": filename,
        "total_pages": len(pages),
        "raw_metadata": raw_metadata,
        "pages": pages
    }

def map_entities_to_bboxes(entities: List[Dict[str, Any]], words: List[Tuple]) -> List[Dict[str, Any]]:
    mapped = []
    for idx, ent in enumerate(entities):
        matched_str = ent["text"]
        matching_boxes = []
        for w in words:
            word_str = w[4]
            if word_str.lower() in matched_str.lower() or matched_str.lower() in word_str.lower():
                matching_boxes.append((w[0], w[1], w[2], w[3]))

        if matching_boxes:
            min_x = min(b[0] for b in matching_boxes)
            min_y = min(b[1] for b in matching_boxes)
            max_x = max(b[2] for b in matching_boxes)
            max_y = max(b[3] for b in matching_boxes)
            w_box = max_x - min_x
            h_box = max_y - min_y
            bbox = [round(min_x, 2), round(min_y, 2), round(w_box, 2), round(h_box, 2)]
        else:
            y_offset = 60 + (idx * 40)
            bbox = [50.0, y_offset, 220.0, 25.0]

        mapped.append({
            "id": ent["id"],
            "text": ent["text"],
            "type": ent["type"],
            "category": ent["category"],
            "bbox": bbox,
            "confidence": ent["confidence"],
            "suggested_action": ent.get("suggested_action", "label"),
            "action": ent.get("action", ent.get("suggested_action", "label")),
            "dummy_value": ent.get("dummy_value", "[REDACTED]"),
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
