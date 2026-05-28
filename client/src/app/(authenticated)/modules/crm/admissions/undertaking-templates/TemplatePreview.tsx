"use client";

import type { UndertakingTemplateContent } from "./types";
import { replaceVariables } from "./utils";

interface TemplatePreviewProps {
  content: UndertakingTemplateContent;
  /** Sample data to replace {{variables}} in preview */
  sampleData?: Record<string, string>;
}

export default function TemplatePreview({ content, sampleData }: TemplatePreviewProps) {
  const data = sampleData ?? {};

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-800 shadow-sm">
      {/* Header */}
      <div className="mb-6 border-b border-slate-300 pb-4 text-center">
        <h1 className="text-base font-bold uppercase tracking-wide text-slate-900">
          {content.header.title}
        </h1>
      </div>

      {/* Header fields */}
      <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-2">
        {content.header.fields.map((field) => (
          <div key={field.key} className="flex gap-2">
            <span className="font-medium text-slate-600">{field.label}:</span>
            <span className="border-b border-dotted border-slate-400 text-slate-900 flex-1">
              {data[field.key] ?? ""}
            </span>
          </div>
        ))}
      </div>

      {/* Sections */}
      {content.sections.map((section) => (
        <div key={section.id} className="mb-5">
          <div className="mb-2 rounded bg-blue-600 px-3 py-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              {section.title}
            </h2>
          </div>

          <div className="space-y-1.5 pl-2">
            {section.items.map((item, index) => {
              const bullet =
                section.type === "numbered"
                  ? `${index + 1}.`
                  : section.type === "alphabetical"
                  ? `${String.fromCharCode(97 + index)}.`
                  : null;

              return (
                <div key={item.id} className="flex items-start gap-2">
                  {section.type === "checkbox" && (
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                      readOnly
                    />
                  )}
                  {bullet && (
                    <span className="mt-0.5 shrink-0 font-medium text-slate-700">{bullet}</span>
                  )}
                  <p className="leading-relaxed">
                    {replaceVariables(item.content, data)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer signatures */}
      {content.footer.signatures.length > 0 && (
        <div className="mt-8 flex justify-around gap-4 border-t border-slate-200 pt-6">
          {content.footer.signatures.map((sig, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-10 w-36 border-b border-slate-400" />
              <span className="text-xs text-slate-500">{sig.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
