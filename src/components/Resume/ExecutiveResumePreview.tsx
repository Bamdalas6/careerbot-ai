'use client';

import React, { useMemo } from 'react';
import {
  ParsedResumeDocument,
  renderExecutiveResumeBody,
  parseResumeDocument,
} from '@/lib/resume-template';
import { FileText } from 'lucide-react';

export interface ExecutiveResumePreviewProps {
  /** Raw CV text or markdown string */
  text?: string;
  /** Optional pre-parsed resume document */
  doc?: ParsedResumeDocument;
  /** Alias for pre-parsed resume document */
  document?: ParsedResumeDocument;
  /** Optional additional CSS class names */
  className?: string;
}

const SCOPED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .executive-paper-sheet {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111827;
    background: #ffffff;
    line-height: 1.45;
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
  }
  .executive-paper-sheet .resume-container {
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
    background: transparent;
  }
  .executive-paper-sheet header {
    border-bottom: 2px solid #111827;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .executive-paper-sheet h1 {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    margin-bottom: 3px;
    line-height: 1.2;
  }
  .executive-paper-sheet .title-sub {
    font-size: 14px;
    font-weight: 600;
    color: #2563eb;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .executive-paper-sheet .contact-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: #4b5563;
    align-items: center;
  }
  .executive-paper-sheet .contact-bar a {
    color: #111827;
    text-decoration: none;
    font-weight: 500;
  }
  .executive-paper-sheet .contact-bar a:hover {
    text-decoration: underline;
    color: #2563eb;
  }
  .executive-paper-sheet section {
    margin-bottom: 14px;
  }
  .executive-paper-sheet h2 {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }
  .executive-paper-sheet p {
    color: #374151;
    text-align: justify;
  }
  .executive-paper-sheet .skills-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    font-size: 12.5px;
  }
  .executive-paper-sheet .skill-row {
    line-height: 1.45;
    color: #374151;
  }
  .executive-paper-sheet .skill-row strong {
    color: #111827;
    font-weight: 600;
  }
  .executive-paper-sheet .job-entry {
    margin-bottom: 11px;
  }
  .executive-paper-sheet .job-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }
  .executive-paper-sheet .job-title {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
  }
  .executive-paper-sheet .job-meta {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
    text-align: right;
    white-space: nowrap;
    margin-left: 16px;
  }
  .executive-paper-sheet ul {
    list-style-type: disc;
    margin-left: 18px;
    margin-top: 2px;
  }
  .executive-paper-sheet li {
    margin-bottom: 2px;
    color: #374151;
    font-size: 12.5px;
    line-height: 1.4;
  }
  .executive-paper-sheet li strong {
    color: #111827;
  }
  .executive-paper-sheet .edu-entry {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
    font-size: 12.5px;
  }
  .executive-paper-sheet .edu-entry strong {
    color: #111827;
    font-weight: 600;
  }
  .executive-paper-sheet .edu-inline {
    font-size: 12px;
    color: #4b5563;
    line-height: 1.5;
  }
  .executive-paper-sheet .edu-inline strong {
    color: #111827;
    font-weight: 600;
  }
  .executive-paper-sheet .project-entry {
    font-size: 12.5px;
    color: #374151;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  .executive-paper-sheet .project-entry strong {
    color: #111827;
    font-weight: 600;
  }
  .executive-paper-sheet .project-entry a {
    color: #2563eb;
    text-decoration: none;
  }
  .executive-paper-sheet .project-entry a:hover {
    text-decoration: underline;
  }
  @media print {
    .executive-paper-sheet {
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
  }
`;

/**
 * Paper-sheet executive resume preview component.
 * Renders high-fidelity executive resume styling matching job-application-agent cv-tailor.mjs.
 * Updates in real-time as candidate edits text in the modal or applies AI modifications.
 */
export const ExecutiveResumePreview: React.FC<ExecutiveResumePreviewProps> = ({
  text,
  doc,
  document,
  className,
}) => {
  const effectiveDoc = doc || document;

  const hasContent = Boolean(
    effectiveDoc || (text && text.trim().length > 0)
  );

  const renderedBody = useMemo(() => {
    if (!hasContent) return '';
    try {
      if (effectiveDoc) {
        return renderExecutiveResumeBody(effectiveDoc);
      }
      if (text) {
        return renderExecutiveResumeBody(text);
      }
      return '';
    } catch {
      return '';
    }
  }, [hasContent, effectiveDoc, text]);

  const baseClasses =
    'executive-paper-sheet bg-white text-[#111827] shadow-xl border border-zinc-200 dark:border-white/10 max-w-[850px] mx-auto p-8 sm:p-10 rounded-lg';
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <div
      className={combinedClasses}
      data-testid="executive-resume-preview"
    >
      <style dangerouslySetInnerHTML={{ __html: SCOPED_STYLES }} />
      {hasContent && renderedBody ? (
        <div
          className="executive-resume-content"
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
          <FileText className="mb-3 h-10 w-10 stroke-1 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">No resume content to preview</p>
          <p className="mt-1 text-xs text-zinc-400">
            Add text in the editor or rebuild your CV to see the executive preview.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExecutiveResumePreview;
