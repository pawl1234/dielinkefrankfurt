'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LinkIcon from '@mui/icons-material/Link';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  minHeight?: number;
}

// Styled component for the editor content
const StyledEditorContent = styled(EditorContent, {
  shouldForwardProp: (prop) => prop !== 'minHeight',
})<{ minHeight?: number }>(({ theme, minHeight = 150 }) => ({
  '& .ProseMirror': {
    padding: theme.spacing(2),
    minHeight: `${minHeight}px`,
    outline: 'none',
    '&:focus': {
      outline: 'none',
    },
    '& p': {
      marginBottom: theme.spacing(1.5)
    },
    '& ul': {
      marginLeft: theme.spacing(3),
      marginBottom: theme.spacing(1.5)
    },
    // Add placeholder styling
    '&[data-placeholder]::before': {
      content: 'attr(placeholder)',
      color: theme.palette.text.secondary,
      pointerEvents: 'none',
      position: 'absolute',
      opacity: 0.6,
    },
    '&:not(:empty)::before': {
      display: 'none'
    }
  }
}));

// Styled toggle button to match the theme
const EditorToggleButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  padding: theme.spacing(0.5),
  marginRight: theme.spacing(1),
  backgroundColor: active ? theme.palette.action.selected : 'transparent',
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    backgroundColor: active
      ? theme.palette.action.hover
      : theme.palette.action.hover,
  },
}));

const RichTextEditor = ({ value, onChange, maxLength = 50000, placeholder, minHeight = 150 }: RichTextEditorProps) => {
  const [charCount, setCharCount] = useState(0);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const currentCount = html.length;

      setCharCount(currentCount);

      if (currentCount <= maxLength) {
        onChange(html);
        setShowLimitMessage(false);
      } else {
        setShowLimitMessage(true);
      }
    },
    editorProps: {
      attributes: {
        placeholder: placeholder || '',
      },
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

  // Calculate percentage for progress bar
  const usagePercentage = Math.min((charCount / maxLength) * 100, 100);
  const progressColor = usagePercentage > 90 ? 'error' : usagePercentage > 70 ? 'warning' : 'primary';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1,
        overflow: 'hidden',
        mb: 2
      }}
    >
      <Box sx={{
        display: 'flex',
        p: 1,
        bgcolor: 'grey.50',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Tooltip title="Fett">
          <EditorToggleButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            <FormatBoldIcon fontSize="small" />
          </EditorToggleButton>
        </Tooltip>

        <Tooltip title="Kursiv">
          <EditorToggleButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            <FormatItalicIcon fontSize="small" />
          </EditorToggleButton>
        </Tooltip>

        <Tooltip title="Aufzählung">
          <EditorToggleButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
          >
            <FormatListBulletedIcon fontSize="small" />
          </EditorToggleButton>
        </Tooltip>

        <Tooltip title="Link einfügen">
          <EditorToggleButton
            size="small"
            onClick={() => {
              const url = window.prompt('URL eingeben:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            active={editor.isActive('link')}
          >
            <LinkIcon fontSize="small" />
          </EditorToggleButton>
        </Tooltip>
      </Box>

      <StyledEditorContent editor={editor} minHeight={minHeight} />

      <Divider />

      <Box sx={{
        p: 1.5,
        bgcolor: 'grey.50',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.5
        }}>
          <Typography variant="caption" color="text.secondary">
            {charCount} / {maxLength} Zeichen
          </Typography>

          {showLimitMessage && (
            <Typography variant="caption" color="error">
              Zeichenlimit von {maxLength} erreicht.
            </Typography>
          )}
        </Box>

        <LinearProgress
          variant="determinate"
          value={usagePercentage}
          color={progressColor}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;