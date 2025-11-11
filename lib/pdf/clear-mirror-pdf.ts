/**
 * Clear Mirror PDF Generator
 *
 * Generates PDF exports of Clear Mirror reports (solo and relational)
 * using the E-Prime formatted templates from lib/templates/clear-mirror-template.ts
 */

import { generateClearMirrorMarkdown, type ClearMirrorData } from '@/lib/templates/clear-mirror-template';

/**
 * Converts markdown to HTML for PDF rendering
 */
function markdownToHTML(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code inline
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs (lines that aren't already wrapped)
  html = html.split('\n\n').map(para => {
    if (para.match(/^<[h1-6|ul|ol|blockquote|table]/)) {
      return para;
    }
    return `<p>${para}</p>`;
  }).join('\n');

  // Details/Summary (collapsible sections)
  html = html.replace(/<details>/g, '<details style="margin-top: 1em;">');
  html = html.replace(/<summary>(.+?)<\/summary>/g, '<summary style="cursor: pointer; font-weight: 600; color: #4338ca;">$1</summary>');

  // Tables
  html = html.replace(/<table>/g, '<table style="width: 100%; border-collapse: collapse; margin: 1em 0;">');
  html = html.replace(/<th>/g, '<th style="border: 1px solid #e5e7eb; padding: 8px; background: #f3f4f6; text-align: left;">');
  html = html.replace(/<td>/g, '<td style="border: 1px solid #e5e7eb; padding: 8px;">');

  return html;
}

/**
 * Creates styled HTML container for PDF export
 */
function createPDFContent(data: ClearMirrorData): HTMLElement {
  const markdown = generateClearMirrorMarkdown(data);
  const htmlContent = markdownToHTML(markdown);

  const container = document.createElement('div');
  container.style.cssText = `
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    max-width: 8in;
    margin: 0 auto;
    padding: 0.5in;
    background: white;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 11pt;
  `;

  // Add custom styles for Clear Mirror elements
  const styleBlock = `
    <style>
      h1 {
        color: #4338ca;
        font-size: 24pt;
        margin: 0.5em 0;
        border-bottom: 2px solid #4338ca;
        padding-bottom: 0.2em;
      }
      h2 {
        color: #4338ca;
        font-size: 18pt;
        margin: 0.8em 0 0.4em 0;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.2em;
      }
      h3 {
        color: #1e293b;
        font-size: 14pt;
        margin: 0.6em 0 0.3em 0;
        font-weight: 600;
      }
      p {
        margin: 0.5em 0;
        text-align: justify;
      }
      blockquote {
        margin: 1em 0;
        padding: 0.5em 1em;
        background: #f8fafc;
        border-left: 4px solid #3b82f6;
        font-style: italic;
      }
      code {
        font-family: 'Courier New', monospace;
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10pt;
      }
      ul {
        margin: 0.5em 0;
        padding-left: 1.5em;
      }
      li {
        margin: 0.3em 0;
      }
      sup {
        color: #3b82f6;
        font-weight: 600;
      }
      strong {
        color: #1e293b;
      }
      em {
        color: #475569;
      }
      details {
        margin: 1em 0;
        padding: 0.5em;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
      }
      summary {
        cursor: pointer;
        font-weight: 600;
        color: #4338ca;
      }
      .frontstage {
        background: #eef2ff;
        padding: 1em;
        border-radius: 8px;
        margin: 1em 0;
      }
      .core-insight {
        margin: 1em 0;
        padding: 0.8em;
        background: #f1f5f9;
        border-left: 3px solid #6366f1;
      }
      .polarity-card {
        margin: 0.8em 0;
        padding: 0.6em;
        background: #fef3c7;
        border-left: 3px solid #f59e0b;
      }
      .mirror-voice {
        background: #ecfdf5;
        padding: 1em;
        border-radius: 8px;
        margin: 1em 0;
        font-style: italic;
      }
      .socratic-closure {
        background: #f8fafc;
        padding: 0.8em;
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        margin: 1em 0;
      }
      .wb-mark { color: #22c55e; font-weight: 600; }
      .abe-mark { color: #f59e0b; font-weight: 600; }
      .osr-mark { color: #ef4444; font-weight: 600; }
    </style>
  `;

  container.innerHTML = styleBlock + htmlContent;

  return container;
}

/**
 * Generates and downloads Clear Mirror PDF
 */
export async function generateClearMirrorPDF(data: ClearMirrorData): Promise<void> {
  let element: HTMLElement | null = null;

  try {
    // Dynamically import html2pdf
    const html2pdf = (await import('html2pdf.js')).default;

    // Create styled content
    element = createPDFContent(data);
    document.body.appendChild(element);

    // Determine filename based on report type
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = data.chartType === 'relational' && data.personBName
      ? `clear-mirror-relational-${data.personName}-${data.personBName}-${timestamp}.pdf`
      : `clear-mirror-${data.personName}-${timestamp}.pdf`;

    // PDF generation options
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: {
        unit: 'in',
        format: 'letter',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: 'h2'
      }
    };

    // Generate and download PDF
    await html2pdf().from(element).set(opt).save();

    return Promise.resolve();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Clear Mirror PDF generation failed:', error);
    throw new Error('Failed to generate Clear Mirror PDF. See console for details.');
  } finally {
    // Clean up
    if (element?.isConnected) {
      document.body.removeChild(element);
    }
  }
}
