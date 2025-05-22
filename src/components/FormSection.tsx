'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@mui/material';
import SectionHeader from './SectionHeader';

interface FormSectionProps {
  title: string;
  helpTitle?: string;
  helpText?: React.ReactNode;
  children: ReactNode;
}

/**
 * Reusable component for form sections
 * Provides consistent styling and structure for form sections including:
 * - Card with consistent styling
 * - Section header with help text
 * - Content area for form fields
 */
export default function FormSection({
  title,
  helpTitle,
  helpText,
  children
}: FormSectionProps) {
  return (
    <Card variant="outlined" sx={{
      mb: 3,
      borderLeft: 4,
      borderLeftColor: 'primary.main',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
    }}>
      <CardContent>
        <SectionHeader
          title={title}
          helpTitle={helpTitle}
          helpText={helpText}
        />
        {children}
      </CardContent>
    </Card>
  );
}