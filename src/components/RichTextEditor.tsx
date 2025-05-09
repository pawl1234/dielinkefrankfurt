'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}

const RichTextEditor = ({ value, onChange, maxLength }: RichTextEditorProps) => {
  const [charCount, setCharCount] = useState(0);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const currentCount = html.length;
      
      setCharCount(currentCount);
      
      if (currentCount <= maxLength) {
        onChange(html);
        setShowLimitMessage(false);
      } else {
        setShowLimitMessage(true);
      }
    },
  });
  
  useEffect(() => {
    if (editor && value === '') {
      editor.commands.setContent('');
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="flex p-2 bg-gray-50 border-b">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded mr-1 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Fett"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded mr-1 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="Kursiv"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded mr-1 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="Aufzählung"
        >
          • Liste
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL eingeben:');
            if (url) {
              // Set link with the URL
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-1 rounded mr-1 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          title="Link"
        >
          🔗
        </button>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="prose p-3 min-h-[150px] focus:outline-none" 
      />
      
      <div className="flex justify-between items-center p-2 bg-gray-50 border-t text-sm text-gray-500">
        <div>
          {charCount} / {maxLength} Zeichen
        </div>
        {showLimitMessage && (
          <div className="text-dark-crimson">
            Maximum character limit of 1000 reached.
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;