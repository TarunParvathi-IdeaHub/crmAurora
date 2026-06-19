// ── Undertaking Template JSON Schema ─────────────────────────────────────────

export type SectionType =
  | "paragraph"
  | "numbered"
  | "alphabetical"
  | "checkbox"
  | "table"
  | "signature";

export interface TemplateSection {
  id: string;
  title: string;
  items: SectionItem[];
}

export interface SectionItem {
  id: string;
  type: SectionType;
  content: string;
}

export interface HeaderField {
  label: string;
  key: string;
  type: "text" | "date" | "number";
}

export interface TemplateHeader {
  title: string;
  fields: HeaderField[];
}

export interface SignatureBlock {
  label: string;
}

export interface TemplateFooter {
  signatures: SignatureBlock[];
}

export interface UndertakingTemplateContent {
  header: TemplateHeader;
  sections: TemplateSection[];
  footer: TemplateFooter;
}

export interface UndertakingTemplate {
  id: string;
  title: string;
  version: string;
  description?: string;
  isActive: boolean;
  publishedAt?: string;
  createdAt: string;
  content: UndertakingTemplateContent;
  programmeIds?: string[];
}
