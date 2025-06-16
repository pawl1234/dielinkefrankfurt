'use client';

import { useState } from 'react';
import AppointmentForm from './AppointmentForm';
import { Box, Button, Typography } from '@mui/material';

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

interface FormInput {
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: Date | null;
  endDateTime?: Date | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  captchaToken?: string;
  files?: (File | Blob)[];
  coverImage?: File | Blob;
  croppedCoverImage?: File | Blob;
  newCoverImageForUpload?: File | Blob;
  newCroppedCoverImageForUpload?: File | Blob;
  featured?: boolean;
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
  const [, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = async (data: FormInput, files: (File | Blob)[], existingFileUrls?: string[], deletedFileUrls?: string[]) => {
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
      
      // Add featured flag, preferring the one from the form data if available
      const featured = data.featured !== undefined ? data.featured : appointment.featured;
      formData.append('featured', featured.toString());
      
      // Handle cover images for featured appointments
      if (featured && data.newCoverImageForUpload) {
        formData.append('coverImage', data.newCoverImageForUpload);
        if (data.newCroppedCoverImageForUpload) {
          formData.append('croppedCoverImage', data.newCroppedCoverImageForUpload);
        }
      }
      
      // Append new files
      if (files.length > 0) {
        files.forEach((file, index) => {
          formData.append(`file-${index}`, file);
        });
        formData.append('fileCount', files.length.toString());
      }
      
      // Handle existing and deleted files
      if (existingFileUrls && existingFileUrls.length > 0) {
        formData.append('existingFileUrls', JSON.stringify(existingFileUrls));
      }
      
      if (deletedFileUrls && deletedFileUrls.length > 0) {
        formData.append('deletedFileUrls', JSON.stringify(deletedFileUrls));
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
      console.log("Edit completed successfully, refreshing view...");
      setIsEditing(false);
      
      // Wait a short time before refreshing to allow database updates to complete
      setTimeout(() => {
        if (onEditComplete) {
          console.log("Calling onEditComplete to refresh the view...");
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

  // Otherwise show the regular appointment view with a hidden edit button that can be triggered programmatically
  return (
    <Box>
      {/* Render the provided appointment component */}
      {appointmentComponent}
      
      {/* Hidden button for programmatic access */}
      <Button 
        sx={{ display: 'none' }}
        data-appointment-id={appointment.id}
        onClick={handleEditToggle}
      />
    </Box>
  );
}