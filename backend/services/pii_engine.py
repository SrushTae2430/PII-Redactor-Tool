import re
from typing import List, Dict, Any

try:
    from presidio_analyzer import AnalyzerEngine
    presidio_analyzer = AnalyzerEngine()
except Exception:
    presidio_analyzer = None

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

PATTERNS = {
    # PAN Card (India): 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
    "PAN": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
    # Aadhaar Card: 12 digits with optional spaces or hyphens
    "AADHAAR": r"\b[2-9]{1}[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b",
    # US SSN
    "SSN": r"\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b",
    # Credit Card
    "CREDIT_CARD": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b",
    # General GOV_ID fallback
    "GOV_ID": r"\b[A-Z0-9]{8,14}\b",
    
    # Date of Birth / Dates
    "DATE_OF_BIRTH": r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b",
    
    # Gender
    "GENDER": r"\b(?:MALE|FEMALE|TRANSGENDER|पुरुष|महिला)\b",

    # Email & Phone
    "EMAIL": r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
    "PHONE_NUMBER": r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
    
    # Address
    "ADDRESS": r"\b\d{1,5}\s+[A-Za-z0-9\s.,-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Nagar|Marg|Road)\b",
    
    # Financial
    "FINANCIAL": r"\b(?:\$|₹|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b|\bIFSC:\s?[A-Z]{4}0[A-Z0-9]{6}\b",

    # Person Name Heuristics (Uppercase Indian & International names e.g. "ANUSHREE VIKAS SURVE", "SURVE VIKAS BHASKAR")
    "PERSON_NAME": r"\b[A-Z]{3,20}\s+[A-Z]{3,20}(?:\s+[A-Z]{3,20})?\b|\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b"
}

def generate_contextual_dummy(entity_type: str, raw_text: str) -> str:
    """Generates realistic synthetic dummy values for DrishtiKon anonymization."""
    et = entity_type.upper()
    if et in ["PAN"]:
        return "XYZPQ9876K"
    elif et in ["AADHAAR"]:
        return "XXXX-XXXX-1234"
    elif et in ["SSN"]:
        return "XXX-XX-0000"
    elif et in ["CREDIT_CARD"]:
        return "XXXX-XXXX-XXXX-0000"
    elif et in ["GOV_ID"]:
        return "ID98765432"
    elif et in ["PERSON_NAME", "NAME"]:
        # Match case of raw text
        if raw_text.isupper():
            return "ROHAN A. DESHMUKH"
        return "Rohan A. Deshmukh"
    elif et in ["DATE_OF_BIRTH", "DATE"]:
        return "15/08/1995"
    elif et in ["GENDER"]:
        return "MALE"
    elif et in ["EMAIL"]:
        return "user@example.com"
    elif et in ["PHONE_NUMBER", "PHONE"]:
        return "+1-555-0199"
    elif et in ["ADDRESS"]:
        return "123 Privacy Marg, Suite 100"
    elif et in ["FINANCIAL"]:
        return "$0.00 USD"
    return "[REDACTED]"

def get_default_suggested_action(entity_type: str) -> str:
    """Returns sensible default action per entity category: blackout | dummy | label."""
    et = entity_type.upper()
    if et in ["PHOTO_ID", "SIGNATURE", "STAMP"]:
        return "blackout"
    elif et in ["GOV_ID", "AADHAAR", "PAN", "SSN", "CREDIT_CARD"]:
        return "dummy"
    else:
        return "label"

def analyze_text_for_pii(text: str) -> List[Dict[str, Any]]:
    entities = []
    seen_ranges = set()

    # 1. Presidio Integration with score threshold 0.35 for maximum recall
    if presidio_analyzer:
        try:
            results = presidio_analyzer.analyze(text=text, language="en", score_threshold=0.35)
            for res in results:
                matched_text = text[res.start:res.end]
                raw_type = res.entity_type
                
                if raw_type == "PERSON":
                    ent_type = "PERSON_NAME"
                elif raw_type in ["IN_AADHAAR", "IN_PAN", "US_SSN", "CREDIT_CARD"]:
                    ent_type = "GOV_ID"
                elif raw_type == "PHONE_NUMBER":
                    ent_type = "PHONE_NUMBER"
                elif raw_type == "EMAIL_ADDRESS":
                    ent_type = "EMAIL"
                elif raw_type == "DATE_TIME":
                    ent_type = "DATE_OF_BIRTH"
                else:
                    ent_type = raw_type

                category = "DIRECT" if ent_type in ["PERSON_NAME", "EMAIL", "PHONE_NUMBER", "GOV_ID", "PAN", "AADHAAR"] else "INDIRECT"
                start, end = res.start, res.end

                if (start, end) not in seen_ranges:
                    seen_ranges.add((start, end))
                    suggested = get_default_suggested_action(ent_type)
                    dummy_val = generate_contextual_dummy(ent_type, matched_text)
                    entities.append({
                        "id": f"ent_{start}_{end}",
                        "text": matched_text,
                        "type": ent_type,
                        "category": category,
                        "start": start,
                        "end": end,
                        "confidence": round(res.score, 2),
                        "suggested_action": suggested,
                        "action": suggested,
                        "dummy_value": dummy_val,
                        "source": "presidio"
                    })
        except Exception:
            pass

    # 2. Key-Value & Form Field Heuristics (Extract text following "Name:", "Father's Name:", "DOB:", "PAN:")
    kv_heuristics = [
        (r"(?:Name|नाम)\s*[:\-\s]+\s*([A-Za-z\s]{3,35})", "PERSON_NAME"),
        (r"(?:Father's Name|पिता का नाम)\s*[:\-\s]+\s*([A-Za-z\s]{3,35})", "PERSON_NAME"),
        (r"(?:Date of Birth|DOB|जन्म तारीख)\s*[:\-\s]+\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", "DATE_OF_BIRTH"),
        (r"(?:PAN|Permanent Account Number)\s*[:\-\s]+\s*([A-Z]{5}[0-9]{4}[A-Z]{1})", "PAN"),
        (r"(?:Aadhaar|UID)\s*[:\-\s]+\s*([2-9]{1}[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4})", "AADHAAR"),
        (r"(?:Gender|Sex|लिंग)\s*[:\-\s]+\s*(MALE|FEMALE|TRANSGENDER)", "GENDER")
    ]

    for pattern, ent_type in kv_heuristics:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            full_start, full_end = match.start(), match.end()
            # Capture entity value group
            val_text = match.group(1).strip()
            val_start = match.start(1)
            val_end = match.end(1)

            if not any(abs(val_start - s) < 4 for (s, e) in seen_ranges):
                seen_ranges.add((val_start, val_end))
                suggested = get_default_suggested_action(ent_type)
                dummy_val = generate_contextual_dummy(ent_type, val_text)
                entities.append({
                    "id": f"ent_kv_{val_start}_{val_end}",
                    "text": val_text,
                    "type": ent_type,
                    "category": "DIRECT" if ent_type in ["PERSON_NAME", "PAN", "AADHAAR"] else "INDIRECT",
                    "start": val_start,
                    "end": val_end,
                    "confidence": 0.98,
                    "suggested_action": suggested,
                    "action": suggested,
                    "dummy_value": dummy_val,
                    "source": "kv_heuristic"
                })

    # 3. High-precision Regex Patterns
    for entity_type, pattern in PATTERNS.items():
        for match in re.finditer(pattern, text):
            start, end = match.start(), match.end()
            matched_str = match.group(0).strip()

            # Ignore generic header strings
            if matched_str.upper() in [
                "INCOME TAX DEPARTMENT", "GOVERNMENT OF INDIA", "PERMANENT ACCOUNT NUMBER",
                "INDIAN OVERSEAS", "DIRECTORY", "CONFIDENTIAL", "REPUBLIC OF INDIA"
            ]:
                continue

            category = "DIRECT" if entity_type in ["PAN", "AADHAAR", "SSN", "CREDIT_CARD", "EMAIL", "PHONE_NUMBER", "PERSON_NAME"] else "INDIRECT"
            overlap = any(abs(start - s) < 3 and abs(end - e) < 3 for (s, e) in seen_ranges)

            if not overlap:
                seen_ranges.add((start, end))
                suggested = get_default_suggested_action(entity_type)
                dummy_val = generate_contextual_dummy(entity_type, matched_str)
                entities.append({
                    "id": f"ent_{start}_{end}",
                    "text": matched_str,
                    "type": entity_type,
                    "category": category,
                    "start": start,
                    "end": end,
                    "confidence": 0.96 if entity_type in ["PAN", "AADHAAR"] else 0.88,
                    "suggested_action": suggested,
                    "action": suggested,
                    "dummy_value": dummy_val,
                    "source": "regex_pattern"
                })

    return entities
