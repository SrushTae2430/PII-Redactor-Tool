import re
from typing import List, Dict, Any

# Try importing Presidio Analyzer with fallback
try:
    from presidio_analyzer import AnalyzerEngine
    presidio_analyzer = AnalyzerEngine()
except Exception:
    presidio_analyzer = None

# Verhoeff algorithm multiplication table & permutation table for Aadhaar validation
VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 1, 2, 3, 4],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]

VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

def is_valid_verhoeff(num_str: str) -> bool:
    digits = [int(c) for c in num_str if c.isdigit()]
    if len(digits) != 12:
        return False
    c = 0
    for i, item in enumerate(reversed(digits)):
        c = VERHOEFF_D[c][VERHOEFF_P[i % 8][item]]
    return c == 0

def is_valid_luhn(card_number: str) -> bool:
    digits = [int(c) for c in card_number if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = digit * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += digit
    return checksum % 10 == 0

# Comprehensive Regex Patterns for Direct and Indirect Identifiers
PATTERNS = {
    "AADHAAR": r"\b[2-9]{1}[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b",
    "PAN": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
    "SSN": r"\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b",
    "CREDIT_CARD": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b",
    "EMAIL": r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
    "PHONE": r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
    "DATE": r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b",
    "ADDRESS": r"\b\d{1,5}\s+[A-Za-z0-9\s.,-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way)\b",
    "FINANCIAL": r"\b(?:\$|₹|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b|\bIFSC:\s?[A-Z]{4}0[A-Z0-9]{6}\b",
    "NAME": r"\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b"
}

def analyze_text_for_pii(text: str) -> List[Dict[str, Any]]:
    """
    Scans input text and returns detected PII entities with bounding tokens, categories, and confidence scores.
    """
    entities = []
    seen_ranges = set()

    # 1. Presidio Integration (if available)
    if presidio_analyzer:
        try:
            results = presidio_analyzer.analyze(text=text, language="en")
            for res in results:
                matched_text = text[res.start:res.end]
                entity_type = res.entity_type
                category = "DIRECT" if entity_type in ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN", "CREDIT_CARD", "IN_PAN", "IN_AADHAAR"] else "INDIRECT"
                
                start, end = res.start, res.end
                if (start, end) not in seen_ranges:
                    seen_ranges.add((start, end))
                    entities.append({
                        "id": f"ent_{start}_{end}",
                        "text": matched_text,
                        "type": entity_type,
                        "category": category,
                        "start": start,
                        "end": end,
                        "confidence": round(res.score, 2),
                        "source": "presidio"
                    })
        except Exception:
            pass

    # 2. Rule-based & Custom Regex Checksum Matching
    for entity_type, pattern in PATTERNS.items():
        for match in re.finditer(pattern, text, re.IGNORECASE):
            start, end = match.start(), match.end()
            matched_str = match.group(0)

            # Additional checksum validation
            if entity_type == "AADHAAR" and not is_valid_verhoeff(matched_str):
                continue
            if entity_type == "CREDIT_CARD" and not is_valid_luhn(matched_str):
                continue

            category = "DIRECT" if entity_type in ["AADHAAR", "PAN", "SSN", "CREDIT_CARD", "EMAIL", "PHONE", "NAME"] else "INDIRECT"

            # Avoid duplicates if range overlaps significantly with existing presidio matches
            overlap = any(abs(start - s) < 3 and abs(end - e) < 3 for (s, e) in seen_ranges)
            if not overlap:
                seen_ranges.add((start, end))
                entities.append({
                    "id": f"ent_{start}_{end}",
                    "text": matched_str,
                    "type": entity_type,
                    "category": category,
                    "start": start,
                    "end": end,
                    "confidence": 0.95 if entity_type in ["AADHAAR", "PAN", "SSN", "CREDIT_CARD"] else 0.88,
                    "source": "regex_checksum"
                })

    return entities
