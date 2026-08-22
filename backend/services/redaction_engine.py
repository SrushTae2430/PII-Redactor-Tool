import io
import pymupdf as fitz
from PIL import Image, ImageDraw
from typing import Dict, Any, List
from services.pii_engine import generate_contextual_dummy, get_label_tag

def apply_true_redaction(
    file_bytes: bytes,
    filename: str,
    active_entities: List[Dict[str, Any]],
    redaction_mode: str = "BLACKOUT",
    purge_metadata: bool = True,
    canary_token: str = None
) -> bytes:
    ext = filename.split(".")[-1].lower()

    if ext == "pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_entities = [e for e in active_entities if e.get("page", 1) == (page_num + 1)]

            text_replacements = []

            for ent in page_entities:
                bbox = ent.get("bbox", [0, 0, 0, 0])
                ent_type = ent.get("type", "SENSITIVE")
                category = ent.get("category", "DIRECT")

                # VISUAL artifacts (photos, QR codes, signatures, stamps) and MANUAL boxes MUST use their full height.
                # Only cap height for single-line text entities (DIRECT / INDIRECT).
                if category in ["VISUAL", "MANUAL"] or ent_type in ["PHOTO_ID", "SIGNATURE", "STAMP", "PHOTO"]:
                    rect = fitz.Rect(float(bbox[0]), float(bbox[1]), float(bbox[0]) + float(bbox[2]), float(bbox[1]) + float(bbox[3]))
                else:
                    tight_h = min(24.0, max(12.0, float(bbox[3])))
                    rect = fitz.Rect(float(bbox[0]), float(bbox[1]), float(bbox[0]) + float(bbox[2]), float(bbox[1]) + tight_h)

                action = ent.get("selected_action") or ent.get("action") or ent.get("suggested_action") or redaction_mode.lower()

                if action == "blackout":
                    page.add_redact_annot(rect, fill=(0, 0, 0))
                elif action == "label":
                    replacement_tag = ent.get("label_tag") or get_label_tag(ent_type)
                    page.add_redact_annot(rect, fill=(1, 1, 1)) # White-out original text bounds
                    text_replacements.append((rect, replacement_tag, (0, 0, 0)))
                elif action == "dummy":
                    dummy_text = ent.get("dummy_value") or generate_contextual_dummy(ent_type, ent.get("text", ""))
                    page.add_redact_annot(rect, fill=(1, 1, 1)) # White-out original text bounds
                    text_replacements.append((rect, dummy_text, (0, 0, 0)))

            # Permanently purge original underlying text streams and glyphs within exact tight rects
            page.apply_redactions()

            # Insert clean in-place replacement text into white-out bounds
            for rect, text_val, text_color in text_replacements:
                calc_size = max(8, min(12, rect.height * 0.70))
                try:
                    page.insert_textbox(
                        rect,
                        text_val,
                        fontsize=calc_size,
                        color=text_color,
                        fontname="helv",
                        align=fitz.TEXT_ALIGN_LEFT
                    )
                except Exception:
                    pass

            if canary_token:
                rect_footer = fitz.Rect(20, page.rect.height - 25, page.rect.width - 20, page.rect.height - 5)
                page.insert_textbox(rect_footer, f"Confidential Canary Watermark: {canary_token}", fontsize=7, color=(0.5, 0.5, 0.5))

        if purge_metadata:
            doc.set_metadata({})

        output_stream = io.BytesIO()
        doc.save(output_stream, garbage=4, deflate=True)
        doc.close()
        return output_stream.getvalue()

    else:
        # Image raster processing
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        draw = ImageDraw.Draw(pil_img)

        for ent in active_entities:
            bbox = ent.get("bbox", [0, 0, 0, 0])
            ent_type = ent.get("type", "SENSITIVE")
            category = ent.get("category", "DIRECT")

            x0, y0 = float(bbox[0]), float(bbox[1])
            if category in ["VISUAL", "MANUAL"] or ent_type in ["PHOTO_ID", "SIGNATURE", "STAMP", "PHOTO"]:
                w, h = float(bbox[2]), float(bbox[3])
            else:
                w, h = float(bbox[2]), min(24.0, max(12.0, float(bbox[3])))

            x1, y1 = x0 + w, y0 + h
            action = ent.get("selected_action") or ent.get("action") or ent.get("suggested_action") or redaction_mode.lower()

            if action == "blackout":
                draw.rectangle([x0, y0, x1, y1], fill=(0, 0, 0))
            elif action == "label":
                draw.rectangle([x0, y0, x1, y1], fill=(255, 255, 255))
                lbl_tag = ent.get("label_tag") or get_label_tag(ent_type)
                draw.text((x0 + 2, y0 + 2), lbl_tag, fill=(0, 0, 0))
            elif action == "dummy":
                draw.rectangle([x0, y0, x1, y1], fill=(255, 255, 255))
                dummy_text = ent.get("dummy_value") or generate_contextual_dummy(ent_type, ent.get("text", ""))
                draw.text((x0 + 2, y0 + 2), dummy_text, fill=(15, 23, 42))

        if canary_token:
            draw.text((20, pil_img.height - 20), f"Confidential Canary: {canary_token}", fill=(128, 128, 128))

        output_stream = io.BytesIO()
        pil_img.save(output_stream, format="PNG")
        return output_stream.getvalue()
