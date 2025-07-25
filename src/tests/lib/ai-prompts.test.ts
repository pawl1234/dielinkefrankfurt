import { 
  buildAIPrompt, 
  buildAIPromptWithExtractedTopics,
  DEFAULT_AI_SYSTEM_PROMPT, 
  DEFAULT_AI_VORSTANDSPROTOKOLL_PROMPT,
  DEFAULT_TOPIC_EXTRACTION_PROMPT
} from '@/lib/ai-prompts';

describe('AI Prompts', () => {
  describe('buildAIPrompt', () => {
    const mockMainPrompt = 'Main prompt with {{topThemes}} and {{previousIntro}}';
    const mockVorstandsPrompt = 'Board content: {{boardProtocol}}';
    const mockTopThemes = 'Climate action and housing rights';
    const mockPreviousIntro = 'Previous newsletter content';

    it('should build prompt with both top themes and board protocol', () => {
      const result = buildAIPrompt(
        mockMainPrompt,
        mockVorstandsPrompt,
        mockTopThemes,
        'Board decisions about new policies',
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Board decisions about new policies');
      expect(result).toContain('Previous newsletter content');
      expect(result).toContain('Board content: Board decisions about new policies');
    });

    it('should build prompt with only top themes when board protocol is null', () => {
      const result = buildAIPrompt(
        mockMainPrompt,
        mockVorstandsPrompt,
        mockTopThemes,
        null,
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Previous newsletter content');
      expect(result).not.toContain('Board content:');
      expect(result).not.toContain('{{boardProtocol}}');
    });

    it('should build prompt with only top themes when board protocol is empty', () => {
      const result = buildAIPrompt(
        mockMainPrompt,
        mockVorstandsPrompt,
        mockTopThemes,
        '   ',
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Previous newsletter content');
      expect(result).not.toContain('Board content:');
    });

    it('should handle null vorstandsprotokoll prompt', () => {
      const result = buildAIPrompt(
        mockMainPrompt,
        null,
        mockTopThemes,
        'Board decisions',
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Previous newsletter content');
      expect(result).not.toContain('Board decisions');
    });

    it('should handle null previous intro', () => {
      const result = buildAIPrompt(
        mockMainPrompt,
        mockVorstandsPrompt,
        mockTopThemes,
        'Board decisions',
        null
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Board decisions');
      expect(result).toContain('Kein vorheriger Newsletter verfügbar.');
    });

    it('should use default prompts correctly', () => {
      const result = buildAIPrompt(
        DEFAULT_AI_SYSTEM_PROMPT,
        DEFAULT_AI_VORSTANDSPROTOKOLL_PROMPT,
        'Environmental protection',
        'New sustainability policies',
        'Last week we talked about climate'
      );

      expect(result).toContain('Environmental protection');
      expect(result).toContain('New sustainability policies');
      expect(result).toContain('Last week we talked about climate');
      expect(result).toContain('DIE LINKE im Kreisverband Frankfurt');
      expect(result).toContain('Kreisvorstandssitzung');
    });
  });

  describe('buildAIPromptWithExtractedTopics', () => {
    const mockMainPrompt = 'Main prompt with {{topThemes}} and {{previousIntro}}';
    const mockTopThemes = 'Climate action and housing rights';
    const mockExtractedTopics = '• New climate policies approved\n• Housing committee formed';
    const mockPreviousIntro = 'Previous newsletter content';

    it('should build prompt with extracted topics', () => {
      const result = buildAIPromptWithExtractedTopics(
        mockMainPrompt,
        mockTopThemes,
        mockExtractedTopics,
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('New climate policies approved');
      expect(result).toContain('Previous newsletter content');
      expect(result).toContain('Aus der Kreisvorstandssitzung sind folgende relevante Themen hervorgegangen');
    });

    it('should build prompt without extracted topics when null', () => {
      const result = buildAIPromptWithExtractedTopics(
        mockMainPrompt,
        mockTopThemes,
        null,
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Previous newsletter content');
      expect(result).not.toContain('Aus der Kreisvorstandssitzung');
    });

    it('should build prompt without extracted topics when empty', () => {
      const result = buildAIPromptWithExtractedTopics(
        mockMainPrompt,
        mockTopThemes,
        '   ',
        mockPreviousIntro
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('Previous newsletter content');
      expect(result).not.toContain('Aus der Kreisvorstandssitzung');
    });

    it('should handle null previous intro', () => {
      const result = buildAIPromptWithExtractedTopics(
        mockMainPrompt,
        mockTopThemes,
        mockExtractedTopics,
        null
      );

      expect(result).toContain('Climate action and housing rights');
      expect(result).toContain('New climate policies approved');
      expect(result).toContain('Kein vorheriger Newsletter verfügbar.');
    });

    it('should use default prompts correctly with extracted topics', () => {
      const result = buildAIPromptWithExtractedTopics(
        DEFAULT_AI_SYSTEM_PROMPT,
        'Environmental protection',
        '• Sustainability committee established\n• Green energy initiative approved',
        'Last week we discussed climate'
      );

      expect(result).toContain('Environmental protection');
      expect(result).toContain('Sustainability committee established');
      expect(result).toContain('Last week we discussed climate');
      expect(result).toContain('DIE LINKE im Kreisverband Frankfurt');
      expect(result).toContain('Aus der Kreisvorstandssitzung');
    });
  });

  describe('DEFAULT_TOPIC_EXTRACTION_PROMPT', () => {
    it('should contain expected extraction instructions', () => {
      expect(DEFAULT_TOPIC_EXTRACTION_PROMPT).toContain('{{boardProtocol}}');
      expect(DEFAULT_TOPIC_EXTRACTION_PROMPT).toContain('Analysiere das folgende Vorstandsprotokoll');
      expect(DEFAULT_TOPIC_EXTRACTION_PROMPT).toContain('Beschlossene Themen und Projekte');
      expect(DEFAULT_TOPIC_EXTRACTION_PROMPT).toContain('Positive Entwicklungen');
      expect(DEFAULT_TOPIC_EXTRACTION_PROMPT).toContain('gendergerechte Sprache');
      expect(DEFAULT_TOPIC_EXTRACTION_PROMPT).toContain('Stichpunkte mit "•"');
    });

    it('should have proper placeholder for board protocol', () => {
      const testProtocol = 'Test board meeting content';
      const processedPrompt = DEFAULT_TOPIC_EXTRACTION_PROMPT.replace('{{boardProtocol}}', testProtocol);
      
      expect(processedPrompt).toContain(testProtocol);
      expect(processedPrompt).not.toContain('{{boardProtocol}}');
    });
  });
});