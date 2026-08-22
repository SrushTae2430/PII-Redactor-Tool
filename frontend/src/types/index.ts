export type EntityCategory = 'DIRECT' | 'INDIRECT' | 'VISUAL' | 'MANUAL';

export type EntityType = 
  | 'PERSON_NAME'
  | 'NAME' 
  | 'EMAIL' 
  | 'PHONE_NUMBER'
  | 'PHONE' 
  | 'GOV_ID'
  | 'AADHAAR' 
  | 'PAN' 
  | 'SSN' 
  | 'CREDIT_CARD' 
  | 'DATE_OF_BIRTH'
  | 'DATE' 
  | 'GENDER'
  | 'ADDRESS' 
  | 'FINANCIAL' 
  | 'SIGNATURE' 
  | 'PHOTO_ID' 
  | 'STAMP'
  | 'MANUAL_REDACTION';

export type RedactionAction = 'blackout' | 'label' | 'dummy';

export interface PIIEntity {
  id: string;
  text: string;
  type: EntityType;
  category: EntityCategory;
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  active: boolean;
  suggested_action?: RedactionAction;
  action: RedactionAction;
  selected_action?: RedactionAction;
  dummy_value: string;
  label_tag: string;
  page?: number;
}

export interface DocumentPage {
  page_number: number;
  width: number;
  height: number;
  image_data: string;
  entities: PIIEntity[];
}

export interface ProcessedDocument {
  filename: string;
  total_pages: number;
  raw_metadata: Record<string, string>;
  prompt_injection_status: {
    clean: boolean;
    threats: string[];
  };
  canary_data?: {
    canary_id: string;
    token_hash: string;
    footer_text: string;
  };
  direct_identifiers?: PIIEntity[];
  indirect_identifiers?: PIIEntity[];
  visual_artifacts?: PIIEntity[];
  pages: DocumentPage[];
}

export type RedactionMode = 'BLACKOUT' | 'SYNTHETIC_LABEL' | 'SMART_DUMMY';

export interface RiskMetrics {
  initial_score: number;
  initial_risk_label: string;
  post_score: number;
  post_risk_label: string;
  direct_identifiers_count: number;
  indirect_identifiers_count: number;
  visual_objects_count: number;
  total_scrubbed_items: number;
  narrative_summary: string;
}

export interface AuditCertificate {
  certificate_id: string;
  timestamp: string;
  document_name: string;
  sanitization_status: string;
  initial_risk_score: string;
  sanitized_risk_score: string;
  items_purged: number;
  metadata_stripped: boolean;
  canary_token_registered: string;
  zero_server_retention: boolean;
  local_engine_signature: string;
}

export interface ProcessingOptions {
  stripMetadata: boolean;
  scanVisuals: boolean;
  enableAiDefenses: boolean;
  purgeMetadata: boolean;
  injectCanary: boolean;
  redactionMode: RedactionMode;
}
