import io
import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont
import base64
from typing import Dict, Any, List
from services.pii_engine import generate_contextual_dummy

def apply_true_redaction(
    file_bytes: bytes,
    filename: str,
    active_entities: List[Dict[str, Any]],
    redaction_mode: str = "BLACKOUT",
    purge_metadata: bool = True,
    canary_token: str = None
) -> bytes:
    """
    Executes true layout-preserved redaction with support for per-entity granular actions:
    'blackout' | 'label' | 'dummy'.
    For 'label' and 'dummy', removes underlying text glyphs cleanly with white fill
    and inserts replacement text cleanly in-place with matching line font size.
    """
    ext = filename.split(".")[-1].lower()

    if ext == "pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_entities = [e for e in active_entities if e.get("page", 1) == (page_num + 1)]

            text_replacements = []

            for ent in page_entities:
                bbox = ent.get("bbox", [0, 0, 0, 0])
                rect = fitz.Rect(bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3])
                ent_type = ent.get("type", "SENSITIVE")

                # Respect per-entity action over global redaction_mode default
                action = ent.get("action", ent.get("suggested_action", redaction_mode.lower()))

                if action == "blackout" or redaction_mode == "BLACKOUT" and "action" not in ent:
                    page.add_redact_annot(rect, fill=(0, 0, 0))
                elif action == "label":
                    replacement_text = f"[{ent_type}]"
                    page.add_redact_annot(rect, fill=(1, 1, 1)) # White out original text
                    text_replacements.append((rect, replacement_text, (0, 0, 0)))
                elif action == "dummy":
                    dummy_text = ent.get("dummy_value") or generate_contextual_dummy(ent_type, ent.get("text", ""))
                    page.add_redact_annot(rect, fill=(1, 1, 1)) # White out original text
                    text_replacements.append((rect, dummy_text, (0.05, 0.15, 0.5)))

            # Permanently purge original underlying text streams and glyphs
            page.apply_redactions()

            # Insert clean in-place replacement text into white-out bounds
            for rect, text_val, text_color in text_replacements:
                calc_size = max(7, min(14, rect.height * 0.7))
                try:
                    page.insert_textbox(
                        rect,
                        text_val,
                        fontsize=calc_size,
                        color=text_color,
                        fontname="helv"
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
            x0, y0, w, h = bbox[0], bbox[1], bbox[2], bbox[3]
            x1, y1 = x0 + w, y0 + h
            ent_type = ent.get("type", "SENSITIVE")

            action = ent.get("action", ent.get("suggested_action", redaction_mode.lower()))

            if action == "blackout":
                draw.rectangle([x0, y0, x1, y1], fill=(0, 0, 0))
            elif action == "label":
                draw.rectangle([x0, y0, x1, y1], fill=(245, 245, 245), outline=(200, 200, 200))
                draw.text((x0 + 3, y0 + 2), f"[{ent_type}]", fill=(0, 0, 0))
            elif action == "dummy":
                dummy_text = ent.get("dummy_value") or generate_contextual_dummy(ent_type, ent.get("text", ""))
                draw.rectangle([x0, y0, x1, y1], fill=(240, 246, 255))
                draw.text((x0 + 3, y0 + 2), dummy_text, fill=(15, 23, 42))

        if canary_token:
            draw.text((20, pil_img.height - 20), f"Confidential Canary: {canary_token}", fill=(128, 128, 128))

        output_stream = io.BytesIO()
        pil_img.save(output_stream, format="PNG")
        return output_stream.getvalue()
