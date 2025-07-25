/**
 * Converts text with newlines to HTML format compatible with Tiptap editor
 */
export class TiptapTextConverter {
  /**
   * Escape HTML special characters to prevent XSS
   */
  private static escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convert text with newlines to HTML paragraphs
   * Each line becomes a separate paragraph
   */
  static toParagraphs(text: string, options?: {
    preserveEmptyLines?: boolean;
    trimLines?: boolean;
  }): string {
    const { preserveEmptyLines = false, trimLines = true } = options || {};
    
    const lines = text.split('\n');
    const processedLines = lines
      .map(line => trimLines ? line.trim() : line)
      .filter(line => preserveEmptyLines || line.length > 0);
    
    if (processedLines.length === 0) {
      return '<p></p>';
    }
    
    return processedLines
      .map(line => {
        const content = this.escapeHTML(line);
        return `<p>${content || (preserveEmptyLines ? '&nbsp;' : '')}</p>`;
      })
      .join('');
  }

  /**
   * Convert text with newlines to a single paragraph with <br> tags
   * Newlines become line breaks within the same paragraph
   */
  static toSingleParagraph(text: string): string {
    if (!text.trim()) {
      return '<p></p>';
    }
    
    const escapedText = this.escapeHTML(text);
    const withBreaks = escapedText.replace(/\n/g, '<br>');
    return `<p>${withBreaks}</p>`;
  }

  /**
   * Convert text treating double newlines as paragraph breaks
   * and single newlines as line breaks
   */
  static toFormattedHTML(text: string, options?: {
    paragraphSeparator?: string;
    trimParagraphs?: boolean;
  }): string {
    const { 
      paragraphSeparator = '\n\n', 
      trimParagraphs = true 
    } = options || {};
    
    // Split by paragraph separator (default: double newline)
    const paragraphs = text.split(paragraphSeparator);
    
    const htmlParagraphs = paragraphs
      .map(para => trimParagraphs ? para.trim() : para)
      .filter(para => para.length > 0)
      .map(para => {
        // Replace single newlines with <br> within paragraphs
        const escapedPara = this.escapeHTML(para);
        const withBreaks = escapedPara.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
      });
    
    return htmlParagraphs.length > 0 ? htmlParagraphs.join('') : '<p></p>';
  }

  /**
   * Convert text with custom line processing
   */
  static toHTML(text: string, options?: {
    mode?: 'paragraphs' | 'single' | 'formatted';
    preserveEmptyLines?: boolean;
    trimLines?: boolean;
    paragraphSeparator?: string;
  }): string {
    const { mode = 'paragraphs', ...restOptions } = options || {};
    
    switch (mode) {
      case 'single':
        return this.toSingleParagraph(text);
      case 'formatted':
        return this.toFormattedHTML(text, restOptions);
      case 'paragraphs':
      default:
        return this.toParagraphs(text, restOptions);
    }
  }
}

/**
 * Standalone function for simple conversions
 */
export function textToTiptapHTML(
  text: string, 
  mode: 'paragraphs' | 'single' | 'formatted' = 'paragraphs'
): string {
  return TiptapTextConverter.toHTML(text, { mode });
}

/**
 * Newsletter-specific conversion function
 * Uses formatted mode to handle paragraph breaks naturally
 */
export function newsletterTextToHTML(text: string): string {
  return TiptapTextConverter.toFormattedHTML(text, {
    paragraphSeparator: '\n\n',
    trimParagraphs: true
  });
}