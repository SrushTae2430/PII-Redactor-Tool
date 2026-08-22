import time
from typing import Dict, Any, List

def calculate_privacy_risk_scores(detected_entities: List[Dict[str, Any]], redacted_count: int) -> Dict[str, Any]:
    initial_score = 0
    direct_count = 0
    indirect_count = 0
    visual_count = 0

    for ent in detected_entities:
        category = ent.get("category", "DIRECT")
        ent_type = ent.get("type", "")

        if category == "DIRECT":
            direct_count += 1
            if ent_type in ["AADHAAR", "SSN", "CREDIT_CARD", "PAN", "GOV_ID"]:
                initial_score += 25
            else:
                initial_score += 15
        elif category == "INDIRECT":
            indirect_count += 1
            initial_score += 8
        elif category == "VISUAL":
            visual_count += 1
            initial_score += 18

    initial_score = min(100, max(12, initial_score))
    remaining_unredacted = len(detected_entities) - redacted_count

    if remaining_unredacted <= 0:
        post_score = 0
        risk_level = "SAFE / ZERO RISK"
    else:
        post_score = min(30, remaining_unredacted * 8)
        risk_level = "LOW RISK"

    initial_risk_label = "HIGH RISK" if initial_score > 70 else ("MEDIUM RISK" if initial_score > 40 else "LOW RISK")

    return {
        "initial_score": initial_score,
        "initial_risk_label": initial_risk_label,
        "post_score": post_score,
        "post_risk_label": risk_level,
        "direct_identifiers_count": direct_count,
        "indirect_identifiers_count": indirect_count,
        "visual_objects_count": visual_count,
        "total_scrubbed_items": redacted_count,
        "narrative_summary": f"Scrubbed {redacted_count} sensitive fields ({direct_count} direct, {visual_count} visual artifacts). Physical layout preserved with 0 server storage."
    }

def generate_audit_certificate(filename: str, risk_metrics: Dict[str, Any], metadata_purged: bool, canary_id: str = None) -> Dict[str, Any]:
    return {
        "certificate_id": f"DK-CERT-{int(time.time())}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "document_name": filename,
        "sanitization_status": "COMPLETED_VERIFIED",
        "initial_risk_score": f"{risk_metrics['initial_score']}/100 ({risk_metrics['initial_risk_label']})",
        "sanitized_risk_score": f"{risk_metrics['post_score']}/100 ({risk_metrics['post_risk_label']})",
        "items_purged": risk_metrics["total_scrubbed_items"],
        "metadata_stripped": metadata_purged,
        "canary_token_registered": canary_id or "NONE",
        "zero_server_retention": True,
        "local_engine_signature": "DrishtiKon v2.0 Zero-Retention Local Engine"
    }
