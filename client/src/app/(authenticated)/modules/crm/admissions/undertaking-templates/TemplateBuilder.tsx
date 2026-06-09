"use client";

import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type {
  UndertakingTemplateContent,
  TemplateSection,
  SectionType,
  SectionItem,
} from "./types";

import { genId } from "./utils";

interface TemplateBuilderProps {
  content: UndertakingTemplateContent;
  onChange: (updated: UndertakingTemplateContent) => void;
}

const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: "numbered", label: "Numbered List" },
  { value: "alphabetical", label: "Alphabetical List" },
  { value: "checkbox", label: "Checkbox List" },
  { value: "paragraph", label: "Paragraph" },
  { value: "table", label: "Table" },
  { value: "signature", label: "Signature Block" },
];

export default function TemplateBuilder({
  content,
  onChange,
}: TemplateBuilderProps) {
  // ─────────────────────────────────────────────────────────────
  // Header
  // ─────────────────────────────────────────────────────────────

  function updateHeaderTitle(title: string) {
    onChange({
      ...content,
      header: {
        ...content.header,
        title,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Sections
  // ─────────────────────────────────────────────────────────────

  function addSection() {
    const newSection: TemplateSection = {
      id: genId(),
      title: "NEW SECTION",
      items: [
        {
          id: genId(),
          type: "numbered",
          content: "Enter clause text here.",
        },
      ],
    };

    onChange({
      ...content,
      sections: [...content.sections, newSection],
    });
  }

  function updateSection(index: number, updated: TemplateSection) {
    const sections = [...content.sections];
    sections[index] = updated;

    onChange({
      ...content,
      sections,
    });
  }

  function removeSection(index: number) {
    const sections = content.sections.filter((_, i) => i !== index);

    onChange({
      ...content,
      sections,
    });
  }

  function moveSectionUp(index: number) {
    if (index === 0) return;

    const sections = [...content.sections];

    [sections[index - 1], sections[index]] = [
      sections[index],
      sections[index - 1],
    ];

    onChange({
      ...content,
      sections,
    });
  }

  function moveSectionDown(index: number) {
    if (index === content.sections.length - 1) return;

    const sections = [...content.sections];

    [sections[index], sections[index + 1]] = [
      sections[index + 1],
      sections[index],
    ];

    onChange({
      ...content,
      sections,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Items
  // ─────────────────────────────────────────────────────────────

  function addItem(sectionIndex: number) {
    const section = content.sections[sectionIndex];

    const updated: TemplateSection = {
      ...section,
      items: [
        ...section.items,
        {
          id: genId(),
          type: "numbered",
          content: "",
        },
      ],
    };

    updateSection(sectionIndex, updated);
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    item: SectionItem
  ) {
    const section = content.sections[sectionIndex];

    const items = [...section.items];
    items[itemIndex] = item;

    updateSection(sectionIndex, {
      ...section,
      items,
    });
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    const section = content.sections[sectionIndex];

    const items = section.items.filter((_, i) => i !== itemIndex);

    updateSection(sectionIndex, {
      ...section,
      items,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Signatures
  // ─────────────────────────────────────────────────────────────

  function addSignature() {
    onChange({
      ...content,
      footer: {
        signatures: [
          ...content.footer.signatures,
          { label: "Signature" },
        ],
      },
    });
  }

  function updateSignature(index: number, label: string) {
    const signatures = [...content.footer.signatures];

    signatures[index] = { label };

    onChange({
      ...content,
      footer: {
        signatures,
      },
    });
  }

  function removeSignature(index: number) {
    const signatures = content.footer.signatures.filter(
      (_, i) => i !== index
    );

    onChange({
      ...content,
      footer: {
        signatures,
      },
    });
  }

  function getItemPrefix(type: SectionType, index: number) {
    switch (type) {
      case "numbered":
        return `${index + 1}.`;

      case "alphabetical":
        return `${String.fromCharCode(97 + index)}.`;

      case "checkbox":
        return "☐";

      case "paragraph":
        return "¶";

      case "table":
        return "▦";

      case "signature":
        return "✍";

      default:
        return "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Document Title
        </label>

        <input
          type="text"
          value={content.header.title}
          onChange={(e) => updateHeaderTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <p className="mt-1.5 text-xs text-slate-400">
          Use{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">
            {"{{variableName}}"}
          </code>{" "}
          for dynamic values.
        </p>
      </div>

      {/* Sections */}

      {content.sections.map((section, si) => (
        <div
          key={section.id}
          className="rounded-lg border border-slate-200 bg-white"
        >
          {/* Section Header */}

          <div className="flex items-center gap-2 rounded-t-lg border-b border-slate-100 bg-slate-50 px-4 py-3">
            <GripVertical
              size={14}
              className="shrink-0 text-slate-400"
            />

            <input
              type="text"
              value={section.title}
              onChange={(e) =>
                updateSection(si, {
                  ...section,
                  title: e.target.value,
                })
              }
              className="flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-700 focus:border-slate-300 focus:bg-white focus:outline-none"
            />

            <button
              onClick={() => moveSectionUp(si)}
              disabled={si === 0}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>

            <button
              onClick={() => moveSectionDown(si)}
              disabled={si === content.sections.length - 1}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>

            <button
              onClick={() => removeSection(si)}
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Items */}

          <div className="flex flex-col gap-3 p-4">
            {section.items.map((item, ii) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-100 p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-2 w-6 shrink-0 text-right text-xs font-medium text-slate-400">
                    {getItemPrefix(item.type, ii)}
                  </span>

                  <select
                    value={item.type}
                    onChange={(e) =>
                      updateItem(si, ii, {
                        ...item,
                        type: e.target.value as SectionType,
                      })
                    }
                    className="w-40 rounded border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
                  >
                    {SECTION_TYPE_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <textarea
                    rows={2}
                    value={item.content}
                    onChange={(e) =>
                      updateItem(si, ii, {
                        ...item,
                        content: e.target.value,
                      })
                    }
                    className="flex-1 resize-none rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Clause text..."
                  />

                  <button
                    onClick={() => removeItem(si, ii)}
                    className="mt-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => addItem(si)}
              className="mt-1 flex items-center gap-1.5 self-start rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-500"
            >
              <Plus size={13} />
              Add Clause
            </button>
          </div>
        </div>
      ))}

      {/* Add Section */}

      <button
        onClick={addSection}
        className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-500"
      >
        <Plus size={16} />
        Add Section
      </button>

      {/* Signatures */}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Signature Blocks
          </label>

          <button
            onClick={addSignature}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-500"
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {content.footer.signatures.map((sig, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={sig.label}
                onChange={(e) =>
                  updateSignature(i, e.target.value)
                }
                className="flex-1 rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              />

              <button
                onClick={() => removeSignature(i)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}