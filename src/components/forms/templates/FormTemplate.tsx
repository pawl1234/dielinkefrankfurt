/**
 * FormTemplate.tsx - Reusable form template following established patterns
 *
 * This template demonstrates the recommended patterns for creating forms using:
 * - React Hook Form with Zod validation (useZodForm)
 * - FormBase for consistent layout and error handling
 * - ValidatedTextField for standard inputs
 * - ValidatedController for complex components
 * - FieldError for custom validation display
 * - FormSection for organized layout
 *
 * Copy this template and customize for your specific form needs.
 *
 * @example
 * // Basic usage
 * <MyForm onSubmit={handleSubmit} />
 *
 * // With initial values
 * <MyForm
 *   initialValues={{ title: 'Existing title' }}
 *   mode="edit"
 *   onSubmit={handleUpdate}
 *   onCancel={handleCancel}
 * />
 */

'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { FieldValues, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel
} from '@mui/material';

// Core form components
import { useZodForm } from '@/hooks/useZodForm';
import FormBase, { FieldRefMap, CustomValidationEntry } from '../shared/FormBase';
import FormSection from '../shared/FormSection';
import ValidatedTextField from '../shared/ValidatedTextField';
import ValidatedController from '../shared/ValidatedController';
import FieldError from '../shared/FieldError';

// UI components for complex fields
import RichTextEditor from '@/components/editor/RichTextEditor';
import FileUpload from '@/components/upload/FileUpload';

/**
 * Zod schema for form validation
 * Define your form structure with proper German error messages
 */
const formTemplateSchema = z.object({
  // Text fields
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(100, 'Titel darf maximal 100 Zeichen haben'),

  description: z.string()
    .min(10, 'Beschreibung muss mindestens 10 Zeichen haben')
    .max(1000, 'Beschreibung darf maximal 1000 Zeichen haben')
    .optional(),

  // Email validation
  email: z.string()
    .email('Ungültige E-Mail-Adresse')
    .optional(),

  // Number fields
  quantity: z.number()
    .min(1, 'Menge muss mindestens 1 sein')
    .max(100, 'Menge darf maximal 100 sein')
    .optional(),

  // Date fields (as strings for form compatibility)
  startDate: z.string()
    .min(1, 'Startdatum ist erforderlich'),

  endDate: z.string()
    .optional(),

  // Select/dropdown fields
  category: z.string()
    .min(1, 'Kategorie ist erforderlich'),

  // Boolean fields
  isActive: z.boolean()
    .optional()
    .default(false),

  // Radio button fields
  priority: z.enum(['low', 'medium', 'high']).optional(),

  // Optional text fields
  notes: z.string()
    .max(500, 'Notizen dürfen maximal 500 Zeichen haben')
    .optional()
});

/**
 * TypeScript type derived from Zod schema
 */
export type FormTemplateData = z.infer<typeof formTemplateSchema>;

/**
 * Props interface for the form component
 */
export interface FormTemplateProps {
  /** Initial form values for editing existing data */
  initialValues?: Partial<FormTemplateData>;

  /** Form mode - affects button text and behavior */
  mode?: 'create' | 'edit';

  /** Custom submit button text */
  submitButtonText?: string;

  /** Form submission handler */
  onSubmit?: (data: FormTemplateData, files?: (File | Blob)[]) => Promise<void>;

  /** Cancel button handler */
  onCancel?: () => void;

  /** Success callback after successful submission */
  onSuccess?: () => void;

  /** Error callback for submission errors */
  onError?: (error: Error) => void;
}

/**
 * Mock data for demonstration
 */
const CATEGORIES = [
  { id: 'tech', name: 'Technologie' },
  { id: 'design', name: 'Design' },
  { id: 'business', name: 'Business' },
  { id: 'other', name: 'Sonstiges' }
];

/**
 * FormTemplate - Comprehensive example of form patterns
 *
 * This template demonstrates:
 * - Basic text fields with validation
 * - Email validation
 * - Number inputs with ranges
 * - Date inputs
 * - Select dropdowns
 * - Checkboxes and radio buttons
 * - Rich text editor integration
 * - File upload with validation
 * - Custom validation for complex fields
 * - Proper error handling and display
 * - TypeScript integration
 *
 * @param props - Form configuration and handlers
 * @returns Rendered form component
 */
export default function FormTemplate({
  initialValues,
  mode = 'create',
  submitButtonText,
  onSubmit,
  onCancel,
  onSuccess,
  onError
}: FormTemplateProps) {

  // Refs for form sections - used for error scrolling
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  // State for complex form fields
  const [richTextContent, setRichTextContent] = useState(initialValues?.description || '');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Default form values
  const defaultValues = useMemo<Partial<FormTemplateData>>(() => ({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    email: initialValues?.email || '',
    quantity: initialValues?.quantity || undefined,
    startDate: initialValues?.startDate || '',
    endDate: initialValues?.endDate || '',
    category: initialValues?.category || '',
    isActive: initialValues?.isActive || false,
    priority: initialValues?.priority || undefined,
    notes: initialValues?.notes || ''
  }), [initialValues]);

  // Form initialization with useZodForm
  const form = useZodForm({
    schema: formTemplateSchema,
    defaultValues,
    onSubmit: handleFormSubmit,
    onSuccess,
    onError
  });

  const { control, setValue, watch } = form;

  // Watch form values for dependent validations
  const watchedStartDate = watch('startDate');
  const watchedCategory = watch('category');
  const watchedIsActive = watch('isActive');

  // Field references for FormBase error scrolling
  const fieldRefs: FieldRefMap = useMemo(() => ({
    'title': basicInfoRef,
    'description': detailsRef,
    'email': basicInfoRef,
    'quantity': detailsRef,
    'startDate': datesRef,
    'endDate': datesRef,
    'category': optionsRef,
    'priority': optionsRef,
    'richTextContent': contentRef,
    'files': filesRef
  }), []);

  // Field order for error scrolling priority
  const fieldOrder: string[] = useMemo(() => [
    'title',
    'email',
    'category',
    'startDate',
    'endDate',
    'quantity',
    'priority',
    'richTextContent',
    'files'
  ], []);

  // Custom validations for complex fields not handled by Zod
  const customValidations: CustomValidationEntry[] = useMemo(() => [
    {
      field: 'richTextContent',
      isValid: !!richTextContent &&
               richTextContent.trim() !== '' &&
               richTextContent.trim() !== '<p></p>',
      message: 'Rich-Text-Inhalt ist erforderlich'
    },
    {
      field: 'files',
      isValid: !fileUploadError,
      message: fileUploadError || 'Datei-Upload-Fehler'
    },
    {
      field: 'endDate',
      isValid: !watchedStartDate || !watch('endDate') ||
               new Date(watch('endDate') || '') >= new Date(watchedStartDate),
      message: 'Enddatum muss nach dem Startdatum liegen'
    }
  ], [richTextContent, fileUploadError, watchedStartDate, watch('endDate')]);

  /**
   * Form submission handler
   * Demonstrates proper data processing and API submission
   */
  async function handleFormSubmit(data: FormTemplateData) {
    // Prepare submission data
    const submissionData = {
      ...data,
      // Include rich text content
      description: richTextContent,
      // Convert string dates to proper format if needed
      startDate: data.startDate,
      endDate: data.endDate || undefined
    };

    // Custom submission logic
    if (onSubmit) {
      await onSubmit(submissionData, fileList);
      return;
    }

    // Default API submission
    const formData = new FormData();

    // Add form fields
    Object.entries(submissionData).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      } else if (typeof value === 'number') {
        formData.append(key, value.toString());
      } else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value));
      }
    });

    // Add files if any
    if (fileList.length > 0) {
      fileList.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    }

    // API submission
    const apiEndpoint = mode === 'edit' ? '/api/template/update' : '/api/template/create';
    const response = await fetch(apiEndpoint, {
      method: mode === 'edit' ? 'PUT' : 'POST',
      body: formData
    });

    if (response.status === 413) {
      throw new Error('Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße.');
    }

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Fehler beim Speichern der Daten');
    }
  }

  /**
   * Rich text editor change handler
   */
  const handleRichTextChange = useCallback((value: string) => {
    setRichTextContent(value);
    setValue('description', value, { shouldValidate: false, shouldDirty: true });
  }, [setValue]);

  /**
   * File selection handler
   */
  const handleFileSelect = useCallback((files: (File | Blob)[]) => {
    setFileList(files);
  }, []);

  /**
   * Form reset handler
   */
  const handleReset = useCallback(() => {
    setRichTextContent(initialValues?.description || '');
    setFileList([]);
    setFileUploadError(null);
  }, [initialValues]);

  // Help text content
  const basicInfoHelpText = (
    <Typography variant="body2">
      Grundlegende Informationen zu Ihrem Eintrag. Alle Felder mit * sind erforderlich.
    </Typography>
  );

  const detailsHelpText = (
    <Typography variant="body2">
      Zusätzliche Details und Konfigurationen für Ihren Eintrag.
    </Typography>
  );

  const datesHelpText = (
    <Typography variant="body2">
      Zeitraum für Ihren Eintrag. Das Enddatum ist optional.
    </Typography>
  );

  const optionsHelpText = (
    <Typography variant="body2">
      Kategorisierung und Prioritätseinstellungen.
    </Typography>
  );

  const contentHelpText = (
    <Typography variant="body2">
      Rich-Text-Inhalt mit Formatierungsmöglichkeiten.
    </Typography>
  );

  const filesHelpText = (
    <Typography variant="body2">
      Dateien anhängen (max. 5 Dateien, je max. 5MB).
    </Typography>
  );

  return (
    <FormBase
      formMethods={form}
      onSubmit={handleFormSubmit}
      fieldRefs={fieldRefs}
      fieldOrder={fieldOrder}
      customValidations={customValidations}
      onReset={handleReset}
      onCancel={onCancel}
      submitButtonText={submitButtonText || (mode === 'edit' ? 'Aktualisieren' : 'Erstellen')}
      mode={mode}
      successMessage={mode === 'edit' ? 'Erfolgreich aktualisiert!' : 'Erfolgreich erstellt!'}
    >

      {/* Basic Information Section */}
      <FormSection
        title="Grundinformationen"
        helpTitle="Basis-Angaben"
        helpText={basicInfoHelpText}
      >
        <Box ref={basicInfoRef} sx={{ display: 'grid', gap: 3 }}>
          <ValidatedTextField
            name="title"
            label="Titel"
            required
            fullWidth
            margin="normal"
            showCharacterCount
          />

          <ValidatedTextField
            name="email"
            label="E-Mail-Adresse"
            type="email"
            fullWidth
            margin="normal"
            helperText="Optional - für Rückfragen"
          />
        </Box>
      </FormSection>

      {/* Details Section */}
      <FormSection
        title="Details"
        helpTitle="Zusätzliche Informationen"
        helpText={detailsHelpText}
      >
        <Box ref={detailsRef} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <ValidatedTextField
            name="quantity"
            label="Anzahl"
            type="number"
            fullWidth
            margin="normal"
            inputProps={{ min: 1, max: 100 }}
          />

          <ValidatedTextField
            name="notes"
            label="Notizen"
            multiline
            rows={3}
            fullWidth
            margin="normal"
            showCharacterCount
          />
        </Box>
      </FormSection>

      {/* Date Section */}
      <FormSection
        title="Zeitraum"
        helpTitle="Datum und Zeit"
        helpText={datesHelpText}
      >
        <Box ref={datesRef} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <ValidatedTextField
            name="startDate"
            label="Startdatum"
            type="date"
            required
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />

          <ValidatedTextField
            name="endDate"
            label="Enddatum"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Optional"
          />
        </Box>

        {/* Custom validation error for date comparison */}
        <FieldError
          name="endDate"
          mode="block"
          customValidations={customValidations}
        />
      </FormSection>

      {/* Options Section */}
      <FormSection
        title="Optionen"
        helpTitle="Kategorien und Einstellungen"
        helpText={optionsHelpText}
      >
        <Box ref={optionsRef}>
          {/* Category Select */}
          <ValidatedController
            name="category"
            useFormControl
            formControlProps={{
              fullWidth: true,
              margin: 'normal'
            }}
            render={({ field, hasError }) => (
              <Select
                {...field}
                displayEmpty
                error={hasError}
                inputProps={{ 'aria-label': 'Kategorie auswählen' }}
              >
                <MenuItem value="" disabled>
                  Kategorie auswählen
                </MenuItem>
                {CATEGORIES.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />

          {/* Active Checkbox */}
          <Box sx={{ mt: 2 }}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value || false}
                    />
                  }
                  label="Aktiv"
                />
              )}
            />
          </Box>

          {/* Priority Radio Buttons */}
          {watchedIsActive && (
            <Box sx={{ mt: 2 }}>
              <FormLabel component="legend">Priorität</FormLabel>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    {...field}
                    row
                    aria-labelledby="priority-radio-buttons-group-label"
                  >
                    <FormControlLabel
                      value="low"
                      control={<Radio />}
                      label="Niedrig"
                    />
                    <FormControlLabel
                      value="medium"
                      control={<Radio />}
                      label="Mittel"
                    />
                    <FormControlLabel
                      value="high"
                      control={<Radio />}
                      label="Hoch"
                    />
                  </RadioGroup>
                )}
              />
            </Box>
          )}
        </Box>
      </FormSection>

      {/* Rich Text Content Section */}
      <FormSection
        title="Inhalt"
        helpTitle="Rich-Text-Editor"
        helpText={contentHelpText}
      >
        <Box ref={contentRef}>
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600, mb: 1 }}>
            Beschreibung <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
          </Typography>

          <RichTextEditor
            value={richTextContent}
            onChange={handleRichTextChange}
            placeholder="Geben Sie hier Ihre Beschreibung ein..."
            maxLength={1000}
          />

          <FieldError
            name="richTextContent"
            mode="block"
            customValidations={customValidations}
          />
        </Box>
      </FormSection>

      {/* File Upload Section */}
      <FormSection
        title="Dateien"
        helpTitle="Datei-Anhänge"
        helpText={filesHelpText}
      >
        <Box ref={filesRef}>
          <FileUpload
            onFilesSelect={handleFileSelect}
            maxFiles={5}
            onError={setFileUploadError}
          />

          <FieldError
            name="files"
            mode="block"
            customValidations={customValidations}
          />
        </Box>
      </FormSection>

    </FormBase>
  );
}

/**
 * Example usage components
 */

/**
 * Simple usage example
 */
export function SimpleFormExample() {
  const handleSubmit = async (data: FormTemplateData) => {
    console.log('Form submitted:', data);
  };

  return (
    <FormTemplate
      onSubmit={handleSubmit}
      submitButtonText="Absenden"
    />
  );
}

/**
 * Edit mode example
 */
export function EditFormExample() {
  const existingData: Partial<FormTemplateData> = {
    title: 'Bestehender Titel',
    description: 'Bestehende Beschreibung',
    email: 'user@example.com',
    category: 'tech',
    isActive: true
  };

  const handleUpdate = async (data: FormTemplateData) => {
    console.log('Form updated:', data);
  };

  const handleCancel = () => {
    console.log('Form cancelled');
  };

  return (
    <FormTemplate
      initialValues={existingData}
      mode="edit"
      onSubmit={handleUpdate}
      onCancel={handleCancel}
    />
  );
}