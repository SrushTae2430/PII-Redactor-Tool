from fastapi import FastAPI, File, UploadFile, Form, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import json
import io
from typing import Optional, List

from auth import (
    authenticate_user, register_user, create_access_token,
    decode_access_token, wipe_session_data
)
from services.document_processor import process_uploaded_document
from services.defense_engine import scan_and_clean_prompt_injections, generate_canary_token
from services.redaction_engine import apply_true_redaction
from services.audit_engine import calculate_privacy_risk_scores, generate_audit_certificate

app = FastAPI(title="PII Shield API", version="1.0.0", description="Zero-Data Retention PII Sanitization Platform")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthRequest(BaseModel):
    email: str
    password: str

@app.get("/")
def read_root():
    return {
        "status": "active",
        "engine": "PII Shield Local-First Zero-Retention Engine",
        "version": "1.0.0"
    }

@app.post("/api/auth/login")
def login(req: AuthRequest):
    if authenticate_user(req.email, req.password):
        token = create_access_token(req.email)
        return {"access_token": token, "token_type": "bearer", "email": req.email}
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.post("/api/auth/signup")
def signup(req: AuthRequest):
    if register_user(req.email, req.password):
        token = create_access_token(req.email)
        return {"access_token": token, "token_type": "bearer", "email": req.email}
    raise HTTPException(status_code=400, detail="User already exists")

@app.post("/api/auth/guest-session")
def guest_session():
    token = create_access_token("guest@piishield.local")
    return {"access_token": token, "token_type": "bearer", "email": "guest@piishield.local"}

@app.post("/api/process")
async def process_document(
    file: UploadFile = File(...),
    strip_metadata: bool = Form(True),
    scan_visuals: bool = Form(True),
    enable_ai_defenses: bool = Form(True)
):
    try:
        content = await file.read()
        parsed_result = process_uploaded_document(content, file.filename)

        prompt_injection_status = {"clean": True, "threats": []}
        canary_data = None

        if enable_ai_defenses:
            # Check prompt injection across text
            raw_text = " ".join([e["text"] for p in parsed_result["pages"] for e in p["entities"]])
            _, is_suspicious, threats = scan_and_clean_prompt_injections(raw_text)
            prompt_injection_status = {
                "clean": not is_suspicious,
                "threats": threats
            }
            canary_data = generate_canary_token()

        return {
            "status": "success",
            "filename": file.filename,
            "total_pages": parsed_result["total_pages"],
            "raw_metadata": parsed_result["raw_metadata"],
            "prompt_injection_status": prompt_injection_status,
            "canary_data": canary_data,
            "pages": parsed_result["pages"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

@app.post("/api/redact")
async def redact_document(
    file: UploadFile = File(...),
    active_entities_json: str = Form(...),
    redaction_mode: str = Form("BLACKOUT"),
    purge_metadata: bool = Form(True),
    canary_token: Optional[str] = Form(None)
):
    try:
        content = await file.read()
        active_entities = json.loads(active_entities_json)

        # Apply layout-preserved true redaction & metadata strip
        redacted_bytes = apply_true_redaction(
            file_bytes=content,
            filename=file.filename,
            active_entities=active_entities,
            redaction_mode=redaction_mode,
            purge_metadata=purge_metadata,
            canary_token=canary_token
        )

        risk_metrics = calculate_privacy_risk_scores(active_entities, len(active_entities))
        audit_cert = generate_audit_certificate(file.filename, risk_metrics, purge_metadata, canary_token)

        return StreamingResponse(
            io.BytesIO(redacted_bytes),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=sanitized_{file.filename}",
                "X-Audit-Certificate": json.dumps(audit_cert),
                "X-Risk-Metrics": json.dumps(risk_metrics)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redaction failed: {str(e)}")

@app.post("/api/wipe-session")
def wipe_session(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            wipe_session_data(payload["sub"])
    return {"status": "success", "message": "All local session memory & tokens wiped completely"}
