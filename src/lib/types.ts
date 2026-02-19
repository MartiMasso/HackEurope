export type DocumentRow = {
  id: string;
  user_id: string;
  type: string;
  filename: string;
  storage_path: string;
  created_at: string;
};

export type FieldRow = {
  id: string;
  user_id: string;
  key: string;
  value: string;
  confidence: number | null;
  source_document_id: string | null;
  source_page: number | null;
  updated_at: string;
};

export type PackRow = {
  id: string;
  user_id: string;
  pack_type: string;
  status: string;
  pdf_storage_path: string;
  created_at: string;
};

export type ExtractedField = {
  key: string;
  value: string;
  confidence: number;
  sourcePage: number | null;
};
