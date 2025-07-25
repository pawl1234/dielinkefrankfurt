import { TiptapTextConverter, textToTiptapHTML, newsletterTextToHTML } from '@/lib/tiptap-text-converter';

// Mock document for tests
const mockDocument = {
  createElement: (tagName: string) => {
    if (tagName === 'div') {
      let textContent = '';
      return {
        set textContent(value: string) {
          textContent = value;
        },
        get innerHTML() {
          // Simple HTML escaping for test purposes
          return textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        }
      };
    }
    return {};
  }
};

// @ts-ignore
global.document = mockDocument;

describe('TiptapTextConverter', () => {
  describe('toParagraphs', () => {
    it('should convert each line to a paragraph', () => {
      const text = 'First line\nSecond line\nThird line';
      const expected = '<p>First line</p><p>Second line</p><p>Third line</p>';
      
      expect(TiptapTextConverter.toParagraphs(text)).toBe(expected);
    });

    it('should handle empty lines when preserveEmptyLines is true', () => {
      const text = 'First line\n\nThird line';
      const expected = '<p>First line</p><p>&nbsp;</p><p>Third line</p>';
      
      expect(TiptapTextConverter.toParagraphs(text, { preserveEmptyLines: true })).toBe(expected);
    });

    it('should filter empty lines by default', () => {
      const text = 'First line\n\nThird line';
      const expected = '<p>First line</p><p>Third line</p>';
      
      expect(TiptapTextConverter.toParagraphs(text)).toBe(expected);
    });

    it('should trim lines by default', () => {
      const text = '  First line  \n  Second line  ';
      const expected = '<p>First line</p><p>Second line</p>';
      
      expect(TiptapTextConverter.toParagraphs(text)).toBe(expected);
    });

    it('should preserve line spacing when trimLines is false', () => {
      const text = '  First line  \n  Second line  ';
      const expected = '<p>  First line  </p><p>  Second line  </p>';
      
      expect(TiptapTextConverter.toParagraphs(text, { trimLines: false })).toBe(expected);
    });

    it('should escape HTML characters', () => {
      const text = '<script>alert("xss")</script>\n&amp; test';
      const expected = '<p>&lt;script&gt;alert(\"xss\")&lt;/script&gt;</p><p>&amp;amp; test</p>';
      
      expect(TiptapTextConverter.toParagraphs(text)).toBe(expected);
    });

    it('should return empty paragraph for empty input', () => {
      expect(TiptapTextConverter.toParagraphs('')).toBe('<p></p>');
      expect(TiptapTextConverter.toParagraphs('   ')).toBe('<p></p>');
    });
  });

  describe('toSingleParagraph', () => {
    it('should convert newlines to br tags in single paragraph', () => {
      const text = 'First line\nSecond line\nThird line';
      const expected = '<p>First line<br>Second line<br>Third line</p>';
      
      expect(TiptapTextConverter.toSingleParagraph(text)).toBe(expected);
    });

    it('should escape HTML characters', () => {
      const text = '<script>alert("xss")</script>\n&amp; test';
      const expected = '<p>&lt;script&gt;alert(\"xss\")&lt;/script&gt;<br>&amp;amp; test</p>';
      
      expect(TiptapTextConverter.toSingleParagraph(text)).toBe(expected);
    });

    it('should return empty paragraph for empty input', () => {
      expect(TiptapTextConverter.toSingleParagraph('')).toBe('<p></p>');
      expect(TiptapTextConverter.toSingleParagraph('   ')).toBe('<p></p>');
    });
  });

  describe('toFormattedHTML', () => {
    it('should treat double newlines as paragraph breaks', () => {
      const text = 'First paragraph line 1\nFirst paragraph line 2\n\nSecond paragraph';
      const expected = '<p>First paragraph line 1<br>First paragraph line 2</p><p>Second paragraph</p>';
      
      expect(TiptapTextConverter.toFormattedHTML(text)).toBe(expected);
    });

    it('should handle custom paragraph separator', () => {
      const text = 'First paragraph|||Second paragraph|||Third paragraph';
      const expected = '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';
      
      expect(TiptapTextConverter.toFormattedHTML(text, { paragraphSeparator: '|||' })).toBe(expected);
    });

    it('should trim paragraphs by default', () => {
      const text = '  First paragraph  \n\n  Second paragraph  ';
      const expected = '<p>First paragraph</p><p>Second paragraph</p>';
      
      expect(TiptapTextConverter.toFormattedHTML(text)).toBe(expected);
    });

    it('should preserve paragraph spacing when trimParagraphs is false', () => {
      const text = '  First paragraph  \n\n  Second paragraph  ';
      const expected = '<p>  First paragraph  </p><p>  Second paragraph  </p>';
      
      expect(TiptapTextConverter.toFormattedHTML(text, { trimParagraphs: false })).toBe(expected);
    });

    it('should return empty paragraph for empty input', () => {
      expect(TiptapTextConverter.toFormattedHTML('')).toBe('<p></p>');
      expect(TiptapTextConverter.toFormattedHTML('   ')).toBe('<p></p>');
    });
  });

  describe('toHTML', () => {
    it('should use paragraphs mode by default', () => {
      const text = 'First line\nSecond line';
      const expected = '<p>First line</p><p>Second line</p>';
      
      expect(TiptapTextConverter.toHTML(text)).toBe(expected);
    });

    it('should use single mode when specified', () => {
      const text = 'First line\nSecond line';
      const expected = '<p>First line<br>Second line</p>';
      
      expect(TiptapTextConverter.toHTML(text, { mode: 'single' })).toBe(expected);
    });

    it('should use formatted mode when specified', () => {
      const text = 'First paragraph\n\nSecond paragraph';
      const expected = '<p>First paragraph</p><p>Second paragraph</p>';
      
      expect(TiptapTextConverter.toHTML(text, { mode: 'formatted' })).toBe(expected);
    });
  });
});

describe('textToTiptapHTML', () => {
  it('should use paragraphs mode by default', () => {
    const text = 'First line\nSecond line';
    const expected = '<p>First line</p><p>Second line</p>';
    
    expect(textToTiptapHTML(text)).toBe(expected);
  });

  it('should use specified mode', () => {
    const text = 'First line\nSecond line';
    const expected = '<p>First line<br>Second line</p>';
    
    expect(textToTiptapHTML(text, 'single')).toBe(expected);
  });
});

describe('newsletterTextToHTML', () => {
  it('should handle typical newsletter text formatting', () => {
    const text = 'Liebe Genossinnen und Genossen,\n\nhier ist unser aktueller Newsletter mit wichtigen Informationen.\n\nViele Grüße\nDer Vorstand';
    const expected = '<p>Liebe Genossinnen und Genossen,</p><p>hier ist unser aktueller Newsletter mit wichtigen Informationen.</p><p>Viele Grüße<br>Der Vorstand</p>';
    
    expect(newsletterTextToHTML(text)).toBe(expected);
  });

  it('should handle single paragraph newsletter', () => {
    const text = 'Kurze Newsletter-Nachricht ohne Absätze.';
    const expected = '<p>Kurze Newsletter-Nachricht ohne Absätze.</p>';
    
    expect(newsletterTextToHTML(text)).toBe(expected);
  });

  it('should preserve line breaks within paragraphs', () => {
    const text = 'Erster Absatz\nZweite Zeile im ersten Absatz\n\nZweiter Absatz\nZweite Zeile im zweiten Absatz';
    const expected = '<p>Erster Absatz<br>Zweite Zeile im ersten Absatz</p><p>Zweiter Absatz<br>Zweite Zeile im zweiten Absatz</p>';
    
    expect(newsletterTextToHTML(text)).toBe(expected);
  });
});