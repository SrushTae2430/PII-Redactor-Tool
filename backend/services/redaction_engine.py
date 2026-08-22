import io
import pymupdf as fitz
from PIL import Image, ImageDraw
import base64
from typing import Dict, Any, List

DUMMY_REPLACEMENTS = {
    "NAME": "Jane Doe",
    "EMAIL": "sanitized.user@privacy-shield.local",
    "PHONE": "+1-555-000-0000",
    "AADHAAR": "XXXX-XXXX-0000",
    "PAN": "ABCDE0000X",
    "SSN": "XXX-XX-0000",
    "CREDIT_CARD": "XXXX-XXXX-XXXX-0000",
    "DATE": "00/00/0000",
    "ADDRESS": "[REDACTED LOCATION]",
    "FINANCIAL": "$0.00"
}

def apply_true_redaction(
    file_bytes: bytes,
    filename: str,
    active_entities: List[Dict[str, Any]],
    redaction_mode: str = "BLACKOUT",
    purge_metadata: bool = True,
    canary_token: str = None
) -> bytes:
    """
    Executes true layout-preserved redaction.
    For PDFs, utilizes fitz page.add_redact_annot() + page.apply_redactions() to permanently scrub underlying stream text.
    Purges metadata and returns scrubbed binary stream.
    """
    ext = filename.split(".")[-1].lower()

    if ext == "pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Filter entities applicable to this page
            page_entities = [e for e in active_entities if e.get("page", 1) == (page_num + 1)]

            for ent in page_entities:
                bbox = ent.get("bbox", [0, 0, 0, 0])
                rect = fitz.Rect(bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3])
                ent_type = ent.get("type", "SENSITIVE")

                if redaction_mode == "BLACKOUT":
                    page.add_redact_annot(rect, fill=(0, 0, 0))
                elif redaction_mode == "SYNTHETIC_LABEL":
                    label = f"[{ent_type}]"
                    page.add_redact_annot(rect, text=label, fill=(0.95, 0.95, 0.95), text_color=(0, 0, 0))
                elif redaction_mode == "SMART_DUMMY":
                    dummy_text = DUMMY_REPLACEMENTS.get(ent_type, "[ANONYMIZED]")
                    page.add_redact_annot(rect, text=dummy_text, fill=(0.9, 0.95, 1.0), text_color=(0.1, 0.1, 0.5))

            # Apply true stream redactions (permanently deletes glyphs and text stream)
            page.apply_redactions()

            # Inject Canary token footer if enabled
            if canary_token:
                rect_footer = fitz.Rect(20, page.rect.height - 25, page.rect.width - 20, page.rect.height - 5)
                page.insert_textbox(rect_footer, f"Confidential Canary Watermark: {canary_token}", fontsize=7, color=(0.5, 0.5, 0.5))

        # Purge PDF /Info metadata dictionaries completely
        if purge_metadata:
            doc.set_metadata({})

        output_stream = io.BytesIO()
        doc.save(output_stream, garbage=4, deflate=True)
        doc.close()
        return output_stream.getvalue()

    else:
        # Image / DOCX / TXT stream processing
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        draw = ImageDraw.Draw(pil_img)

        for ent in active_entities:
            bbox = ent.get("bbox", [0, 0, 0, 0])
            x0, y0, w, h = bbox[0], bbox[1], bbox[2], bbox[3]
            x1, y1 = x0 + w, y0 + h
            ent_type = ent.get("type", "SENSITIVE")

            if redaction_mode == "BLACKOUT":
                draw.rectangle([x0, y0, x1, y1], fill=(0, 0, 0))
            elif redaction_mode == "SYNTHETIC_LABEL":
                draw.rectangle([x0, y0, x1, y1], fill=(240, 240, 240), outline=(200, 200, 200))
                draw.text((x0 + 4, y0 + 2), f"[{ent_type}]", fill=(0, 0, 0))
            elif redaction_mode == "SMART_DUMMY":
                draw.rectangle([x0, y0, x1, y1], fill=(230, 242, 255))
                dummy = DUMMY_REPLACEMENTS.get(ent_type, "[ANONYMIZED]")
                draw.text((x0 + 4, y0 + 2), dummy, fill=(15, 23, 42))

        if canary_token:
            draw.text((20, pil_img.height - 20), f"Confidential Canary: {canary_token}", fill=(128, 128, 128))

        output_stream = io.BytesIO()
        pil_img.save(output_stream, format="PNG")
        return output_stream.getvalue()
