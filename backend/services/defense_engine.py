import re
import uuid
from typing import Dict, Any, Tuple

# Common prompt injection pattern signatures
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"system\s+prompt:",
    r"override\s+security\s+rules",
    r"disregard\s+above\s+text",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"jailbreak",
    r"output\s+the\s+following\s+secret"
]

ZERO_WIDTH_CHARS = [
    "\u200B",  # Zero-width space
    "\u200C",  # Zero-width non-joiner
    "\u200D",  # Zero-width joiner
    "\uFEFF",  # Zero-width no-break space (BOM)
    "\u202A", "\u202B", "\u202C", "\u202D", "\u202E" # Directional overrides
]

def scan_and_clean_prompt_injections(text: str) -> Tuple[str, bool, List[str]]:
    """
    Scans raw extracted text for hidden zero-width characters and prompt injection attacks.
    Returns (cleaned_text, is_suspicious, list_of_detected_threats).
    """
    threats = []
    cleaned_text = text

    # 1. Detect and strip zero-width characters
    for zw_char in ZERO_WIDTH_CHARS:
        if zw_char in cleaned_text:
            threats.append("Hidden Zero-Width Unicode Characters Detected")
            cleaned_text = cleaned_text.replace(zw_char, "")

    # 2. Scan for prompt injection keywords
    for pattern in PROMPT_INJECTION_PATTERNS:
        matches = re.findall(pattern, cleaned_text, re.IGNORECASE)
        if matches:
            threats.append(f"Prompt Injection Payload Signature: '{matches[0]}'")
            # Neutralize injection by escaping
            cleaned_text = re.sub(pattern, "[NEUTRALIZED_PROMPT_INJECTION]", cleaned_text, flags=re.IGNORECASE)

    is_suspicious = len(threats) > 0
    return cleaned_text, is_suspicious, threats

def generate_canary_token() -> Dict[str, str]:
    """
    Generates a unique cryptographic Canary Trap token to track potential document leaks.
    """
    short_hash = str(uuid.uuid4())[:8].upper()
    canary_id = f"CANARY-{short_hash}-X"
    return {
        "canary_id": canary_id,
        "token_hash": hashlib.sha256(canary_id.encode()).hexdigest()[:16],
        "footer_text": f"Confidential Document Watermark - Tracking ID: {canary_id}"
    }

import hashlib
