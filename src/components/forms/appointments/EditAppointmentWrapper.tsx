'use client';

import { useState } from 'react';
import AppointmentForm from './AppointmentForm';
import { Box, Button, Typography } from '@mui/material';
import { AppointmentSubmitData } from '@/lib/validation/appointment';
import { createAppointmentFormData } from '@/lib/form-submission';

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
  metadata?: string | null;
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

  const handleSubmit = async (data: AppointmentSubmitData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { files, coverImage, croppedCoverImage, existingFileUrls, deletedFileUrls, ...formFields } = data;

      const formData = createAppointmentFormData(
        { ...formFields, id: appointment.id, status: appointment.status },
        files,
        coverImage,
        croppedCoverImage,
        existingFileUrls,
        deletedFileUrls
      );

      const response = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appointment');
      }

      setIsEditing(false);

      setTimeout(() => {
        if (onEditComplete) {
          onEditComplete();
        }
      }, 500);
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <Box>
      {appointmentComponent}

      <Button
        sx={{ display: 'none' }}
        data-appointment-id={appointment.id}
        onClick={handleEditToggle}
      />
    </Box>
  );
}