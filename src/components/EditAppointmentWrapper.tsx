'use client';

import { useState } from 'react';
import AppointmentForm from './AppointmentForm';
import { Box, Button, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface Appointment {
  id: number;
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  firstName: string | null;
  lastName: string | null;
  recurringText: string | null;
  fileUrls: string | null;
  featured: boolean;
  createdAt: string;
  processed: boolean;
  processingDate: string | null;
  status: 'pending' | 'accepted' | 'rejected';
}

interface FormInput {
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: Date;
  endDateTime?: Date;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  captchaToken?: string;
  files?: (File | Blob)[];
}

interface EditAppointmentWrapperProps {
  appointment: Appointment;
  onEditComplete?: () => void;
  appointmentComponent: React.ReactNode;
}

export default function EditAppointmentWrapper({
  appointment,
  onEditComplete,
  appointmentComponent
}: EditAppointmentWrapperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = async (data: FormInput, files: (File | Blob)[]) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare data for API
      const formData = new FormData();
      formData.append('id', appointment.id.toString());
      formData.append('title', data.title);
      formData.append('teaser', data.teaser || '');
      formData.append('mainText', data.mainText);

      // Handle date formatting
      if (data.startDateTime) {
        formData.append('startDateTime', data.startDateTime instanceof Date ?
          data.startDateTime.toISOString() :
          new Date(data.startDateTime).toISOString());
      }

      if (data.endDateTime) {
        formData.append('endDateTime', data.endDateTime instanceof Date ?
          data.endDateTime.toISOString() :
          new Date(data.endDateTime).toISOString());
      }

      // Add other form fields
      formData.append('street', data.street || '');
      formData.append('city', data.city || '');
      formData.append('state', data.state || '');
      formData.append('postalCode', data.postalCode || '');
      formData.append('firstName', data.firstName || '');
      formData.append('lastName', data.lastName || '');
      formData.append('recurringText', data.recurringText || '');
      formData.append('status', appointment.status);
      formData.append('featured', appointment.featured.toString());
      
      // Append new files
      if (files.length > 0) {
        files.forEach((file, index) => {
          formData.append(`file-${index}`, file);
        });
        formData.append('fileCount', files.length.toString());
      }

      // Call API to update appointment
      const response = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appointment');
      }

      // Exit edit mode and call completion handler
      setIsEditing(false);
      if (onEditComplete) {
        onEditComplete();
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we're in edit mode, show the form
  if (isEditing) {
    return (
      <Box sx={{ mt: 2 }}>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <AppointmentForm
          initialValues={appointment}
          mode="edit"
          submitButtonText="Speichern"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </Box>
    );
  }

  // Otherwise show the regular appointment view with edit button
  return (
    <Box>
      {/* Render the provided appointment component */}
      {appointmentComponent}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleEditToggle}
          disabled={isSubmitting}
        >
          Bearbeiten
        </Button>
      </Box>
    </Box>
  );
}