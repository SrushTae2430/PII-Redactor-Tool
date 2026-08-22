import re
from typing import List, Dict, Any

try:
    from presidio_analyzer import AnalyzerEngine
    presidio_analyzer = AnalyzerEngine()
except Exception:
    presidio_analyzer = None

PATTERNS = {
    # Indian PAN Card: 5 letters, 4 digits, 1 letter
    "PAN": {
        "pattern": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
        "category": "DIRECT",
        "label_tag": "[PAN]",
        "dummy": "XYZPQ9876K"
    },
    # Aadhaar Number: 12 digits with optional spaces/hyphens
    "AADHAAR": {
        "pattern": r"\b[2-9]{1}[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b",
        "category": "DIRECT",
        "label_tag": "[AADHAAR]",
        "dummy": "9876 5432 1098"
    },
    # US SSN
    "SSN": {
        "pattern": r"\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b",
        "category": "DIRECT",
        "label_tag": "[SSN]",
        "dummy": "XXX-XX-0000"
    },
    # Credit Card
    "CREDIT_CARD": {
        "pattern": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b",
        "category": "DIRECT",
        "label_tag": "[CARD]",
        "dummy": "XXXX-XXXX-XXXX-0000"
    },
    # Email Address
    "EMAIL": {
        "pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "category": "DIRECT",
        "label_tag": "[EMAIL]",
        "dummy": "xxxxxx@gmail.com"
    },
    # Phone Number
    "PHONE_NUMBER": {
        "pattern": r"\b(?:\+91|0)?[6-9]\d{9}\b|\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "category": "DIRECT",
        "label_tag": "[PHONE]",
        "dummy": "98******10"
    },
    # Date of Birth
    "DATE_OF_BIRTH": {
        "pattern": r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19|20)\d\d\b",
        "category": "INDIRECT",
        "label_tag": "[DOB]",
        "dummy": "18/09/1998"
    },
    # Gender
    "GENDER": {
        "pattern": r"\b(?:MALE|FEMALE|TRANSGENDER|पुरुष|महिला)\b",
        "category": "INDIRECT",
        "label_tag": "[GENDER]",
        "dummy": "MALE"
    },
    # Person Name Heuristics (Uppercase or Title Case names e.g. "Rahul Sharma", "ANUSHREE VIKAS SURVE")
    "PERSON_NAME": {
        "pattern": r"\b[A-Z][a-z]{2,18}\s+[A-Z][a-z]{2,18}\b|\b[A-Z]{3,20}\s+[A-Z]{3,20}(?:\s+[A-Z]{3,20})?\b",
        "category": "DIRECT",
        "label_tag": "[NAME]",
        "dummy": "Amit Kumar"
    }
}

def generate_contextual_dummy(entity_type: str, raw_text: str) -> str:
    et = entity_type.upper()
    if et in ["PAN"]:
        return "XYZPQ9876K"
    elif et in ["AADHAAR", "GOV_ID"]:
        return "9876 5432 1098"
    elif et in ["SSN"]:
        return "XXX-XX-0000"
    elif et in ["CREDIT_CARD"]:
        return "XXXX-XXXX-XXXX-0000"
    elif et in ["PERSON_NAME", "NAME"]:
        if raw_text.isupper():
            return "AMIT KUMAR"
        return "Amit Kumar"
    elif et in ["DATE_OF_BIRTH", "DATE"]:
        return "18/09/1998"
    elif et in ["GENDER"]:
        return "MALE"
    elif et in ["EMAIL"]:
        return "xxxxxx@gmail.com"
    elif et in ["PHONE_NUMBER", "PHONE"]:
        return "98******10"
    elif et in ["ADDRESS"]:
        return "123 Privacy Marg, Suite 100"
    elif et in ["FINANCIAL"]:
        return "$0.00 USD"
    return "[NAME]"

def get_label_tag(entity_type: str) -> str:
    et = entity_type.upper()
    if et in ["PERSON_NAME", "NAME"]: return "[NAME]"
    if et in ["DATE_OF_BIRTH", "DATE"]: return "[DOB]"
    if et in ["AADHAAR"]: return "[AADHAAR]"
    if et in ["PAN"]: return "[PAN]"
    if et in ["GOV_ID"]: return "[GOV_ID]"
    if et in ["EMAIL"]: return "[EMAIL]"
    if et in ["PHONE_NUMBER", "PHONE"]: return "[PHONE]"
    if et in ["GENDER"]: return "[GENDER]"
    if et in ["ADDRESS"]: return "[ADDRESS]"
    if et in ["PHOTO_ID"]: return "[PHOTO]"
    if et in ["SIGNATURE"]: return "[SIGNATURE]"
    if et in ["STAMP"]: return "[STAMP]"
    return "[REDACTED]"

def get_default_suggested_action(entity_type: str) -> str:
    et = entity_type.upper()
    if et in ["PHOTO_ID", "SIGNATURE", "STAMP"]:
        return "blackout"
    elif et in ["GOV_ID", "AADHAAR", "PAN", "SSN", "CREDIT_CARD", "PERSON_NAME", "NAME", "DATE_OF_BIRTH", "GENDER"]:
        return "dummy"
    else:
        return "label"

def analyze_text_for_pii(text: str) -> List[Dict[str, Any]]:
    entities = []
    seen_ranges = set()

    # 1. Key-Value & Form Field Heuristics (Extract values following Name, DOB, Aadhaar, PAN, Email, Phone, Gender)
    kv_heuristics = [
        (r"(?:Name|नाम|Full Name)\s*[:\-\s]+\s*([A-Za-z\s]{3,35})", "PERSON_NAME", "[NAME]", "Amit Kumar"),
        (r"(?:Father's Name|पिता का नाम)\s*[:\-\s]+\s*([A-Za-z\s]{3,35})", "PERSON_NAME", "[NAME]", "Ramesh Sharma"),
        (r"(?:Date of Birth|DOB|जन्म तारीख)\s*[:\-\s]+\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", "DATE_OF_BIRTH", "[DOB]", "18/09/1998"),
        (r"(?:Aadhaar|UID|आधार)\s*[:\-\s]+\s*([2-9]{1}[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4})", "AADHAAR", "[AADHAAR]", "9876 5432 1098"),
        (r"(?:PAN|Permanent Account Number)\s*[:\-\s]+\s*([A-Z]{5}[0-9]{4}[A-Z]{1})", "PAN", "[PAN]", "XYZPQ9876K"),
        (r"(?:Email|Mail|ईमेल)\s*[:\-\s]+\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})", "EMAIL", "[EMAIL]", "xxxxxx@gmail.com"),
        (r"(?:Phone|Mobile|Contact)\s*[:\-\s]+\s*([0-9\+\-\s]{10,15})", "PHONE_NUMBER", "[PHONE]", "98******10"),
        (r"(?:Gender|Sex|लिंग)\s*[:\-\s]+\s*(MALE|FEMALE|TRANSGENDER)", "GENDER", "[GENDER]", "MALE")
    ]

    for pattern, ent_type, tag_str, d_val in kv_heuristics:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            val_text = match.group(1).strip()
            val_start = match.start(1)
            val_end = match.end(1)

            if not any(abs(val_start - s) < 4 for (s, e) in seen_ranges):
                seen_ranges.add((val_start, val_end))
                suggested = get_default_suggested_action(ent_type)
                dummy_val = generate_contextual_dummy(ent_type, val_text) or d_val

                entities.append({
                    "id": f"ent_kv_{val_start}_{val_end}",
                    "text": val_text,
                    "type": ent_type,
                    "category": "DIRECT" if ent_type in ["PERSON_NAME", "PAN", "AADHAAR", "EMAIL", "PHONE_NUMBER"] else "INDIRECT",
                    "start": val_start,
                    "end": val_end,
                    "confidence": 0.98,
                    "suggested_action": suggested,
                    "action": suggested,
                    "selected_action": suggested,
                    "dummy_value": dummy_val,
                    "label_tag": tag_str,
                    "source": "kv_heuristic"
                })

    # 2. Presidio Analyzer Integration with score threshold 0.35
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

                if not any(abs(start - s) < 3 and abs(end - e) < 3 for (s, e) in seen_ranges):
                    seen_ranges.add((start, end))
                    suggested = get_default_suggested_action(ent_type)
                    dummy_val = generate_contextual_dummy(ent_type, matched_text)
                    lbl_tag = get_label_tag(ent_type)

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
                        "selected_action": suggested,
                        "dummy_value": dummy_val,
                        "label_tag": lbl_tag,
                        "source": "presidio"
                    })
        except Exception:
            pass

    # 3. High-precision Regex Patterns
    for entity_type, cfg in PATTERNS.items():
        pattern = cfg["pattern"]
        category = cfg["category"]
        lbl_tag = cfg["label_tag"]
        default_dummy = cfg["dummy"]

        for match in re.finditer(pattern, text):
            start, end = match.start(), match.end()
            matched_str = match.group(0).strip()

            if matched_str.upper() in [
                "INCOME TAX DEPARTMENT", "GOVERNMENT OF INDIA", "PERMANENT ACCOUNT NUMBER",
                "INDIAN OVERSEAS", "DIRECTORY", "CONFIDENTIAL", "REPUBLIC OF INDIA"
            ]:
                continue

            overlap = any(abs(start - s) < 3 and abs(end - e) < 3 for (s, e) in seen_ranges)
            if not overlap:
                seen_ranges.add((start, end))
                suggested = get_default_suggested_action(entity_type)
                dummy_val = generate_contextual_dummy(entity_type, matched_str) or default_dummy

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
                    "selected_action": suggested,
                    "dummy_value": dummy_val,
                    "label_tag": lbl_tag,
                    "source": "regex_pattern"
                })

    return entities
