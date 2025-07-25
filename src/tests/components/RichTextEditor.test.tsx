import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RichTextEditor from '@/components/editor/RichTextEditor';

// Mock TipTap hooks and components
const mockChainableCommands = {
  focus: jest.fn().mockReturnThis(),
  toggleBold: jest.fn().mockReturnThis(),
  toggleItalic: jest.fn().mockReturnThis(),
  toggleBulletList: jest.fn().mockReturnThis(),
  setLink: jest.fn().mockReturnThis(),
  run: jest.fn().mockReturnThis(),
};

const mockEditor = {
  getHTML: jest.fn(),
  commands: {
    setContent: jest.fn(),
    clearContent: jest.fn(),
    insertContent: jest.fn(),
    focus: jest.fn().mockReturnThis(),
    toggleBold: jest.fn().mockReturnThis(),
    toggleItalic: jest.fn().mockReturnThis(),
    toggleBulletList: jest.fn().mockReturnThis(),
    setLink: jest.fn().mockReturnThis(),
    run: jest.fn(),
  },
  chain: jest.fn(() => mockChainableCommands),
  isActive: jest.fn(),
};

let editorConfig: any = null;

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn((config) => {
    editorConfig = config;
    return mockEditor;
  }),
  EditorContent: ({ editor }: { editor: any }) => <div data-testid="editor-content" />,
}));

const mockUseEditor = require('@tiptap/react').useEditor;

jest.mock('@tiptap/starter-kit', () => ({}));
jest.mock('@tiptap/extension-link', () => ({}));

describe('RichTextEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    editorConfig = null;
    mockEditor.getHTML.mockReturnValue('<p>existing content</p>');
    mockEditor.isActive.mockReturnValue(false);
  });

  describe('content handling', () => {
    it('should use setContent for HTML content', async () => {
      const htmlContent = '<p>This is HTML content</p>';
      
      render(
        <RichTextEditor 
          value={htmlContent} 
          onChange={mockOnChange} 
        />
      );

      await waitFor(() => {
        expect(mockEditor.commands.setContent).toHaveBeenCalledWith(htmlContent);
        expect(mockEditor.commands.insertContent).not.toHaveBeenCalled();
      });
    });

    it('should use insertContent for plain text with newlines', async () => {
      const plainTextWithNewlines = 'First paragraph\n\nSecond paragraph\nWith line break';
      mockEditor.getHTML.mockReturnValue(''); // Different from new value to trigger update
      
      render(
        <RichTextEditor 
          value={plainTextWithNewlines} 
          onChange={mockOnChange} 
        />
      );

      await waitFor(() => {
        expect(mockEditor.commands.clearContent).toHaveBeenCalled();
        expect(mockEditor.commands.insertContent).toHaveBeenCalledWith(plainTextWithNewlines);
        expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
      });
    });

    it('should use setContent for plain text without newlines', async () => {
      const plainTextNoNewlines = 'Single line text without newlines';
      mockEditor.getHTML.mockReturnValue(''); // Different from new value to trigger update
      
      render(
        <RichTextEditor 
          value={plainTextNoNewlines} 
          onChange={mockOnChange} 
        />
      );

      await waitFor(() => {
        expect(mockEditor.commands.setContent).toHaveBeenCalledWith(plainTextNoNewlines);
        expect(mockEditor.commands.insertContent).not.toHaveBeenCalled();
      });
    });

    it('should not update content if HTML matches current value', async () => {
      const content = '<p>Same content</p>';
      mockEditor.getHTML.mockReturnValue(content);
      
      render(
        <RichTextEditor 
          value={content} 
          onChange={mockOnChange} 
        />
      );

      await waitFor(() => {
        expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
        expect(mockEditor.commands.insertContent).not.toHaveBeenCalled();
      });
    });
  });

  describe('toolbar functionality', () => {
    it('should render formatting buttons', () => {
      render(
        <RichTextEditor 
          value="test content" 
          onChange={mockOnChange} 
        />
      );

      expect(screen.getByRole('button', { name: /fett/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /kursiv/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aufzählung/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /link einfügen/i })).toBeInTheDocument();
    });

    it('should call bold command when bold button is clicked', () => {
      render(
        <RichTextEditor 
          value="test content" 
          onChange={mockOnChange} 
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /fett/i }));

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChainableCommands.focus).toHaveBeenCalled();
      expect(mockChainableCommands.toggleBold).toHaveBeenCalled();
      expect(mockChainableCommands.run).toHaveBeenCalled();
    });
  });

  describe('character counting', () => {
    it('should display character count', () => {
      mockEditor.getHTML.mockReturnValue('<p>Test content</p>');
      
      render(
        <RichTextEditor 
          value="test content" 
          onChange={mockOnChange}
          maxLength={1000}
        />
      );

      expect(screen.getByText(/\d+ \/ 1000 zeichen/i)).toBeInTheDocument();
    });

    it('should call onChange when content is under limit', () => {
      const shortContent = 'test content';
      const htmlContent = '<p>test content</p>';
      
      render(
        <RichTextEditor 
          value={shortContent} 
          onChange={mockOnChange}
          maxLength={1000}
        />
      );

      // Verify the editor config was captured
      expect(editorConfig).toBeDefined();
      expect(editorConfig.onUpdate).toBeDefined();

      // Mock the HTML content to return the short content (should be under limit)
      mockEditor.getHTML.mockReturnValue(htmlContent);

      // Simulate the editor update event using the captured config
      act(() => {
        editorConfig.onUpdate({ editor: mockEditor });
      });

      // Verify that onChange was called with the HTML content (since it's under the limit)
      expect(mockOnChange).toHaveBeenCalledWith(htmlContent);
    });

    it('should not call onChange when content exceeds limit', () => {
      const longContent = 'a'.repeat(2000); // Way over the 1000 limit
      const htmlContent = `<p>${longContent}</p>`;
      
      render(
        <RichTextEditor 
          value="initial content" 
          onChange={mockOnChange}
          maxLength={1000}
        />
      );

      // Clear any initial calls
      mockOnChange.mockClear();

      // Mock the HTML content to return content over the limit
      mockEditor.getHTML.mockReturnValue(htmlContent);

      // Simulate the editor update event using the captured config
      if (editorConfig && editorConfig.onUpdate) {
        act(() => {
          editorConfig.onUpdate({ editor: mockEditor });
        });
      }

      // Verify that onChange was NOT called (since it's over the limit)
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});