'use client';

import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import EditStatusReportForm from './EditStatusReportForm';
import EditIcon from '@mui/icons-material/Edit';

interface StatusReport {
  id: number;
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status: 'draft' | 'published' | 'rejected';
  createdAt: string;
  updatedAt: string;
  fileUrls: string | null;
}

interface FormInput {
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status?: 'draft' | 'published' | 'rejected';
  files?: (File | Blob)[];
}

interface EditStatusReportWrapperProps {
  statusReport: StatusReport;
  onEditComplete?: () => void;
  statusReportComponent: React.ReactNode;
}

export default function EditStatusReportWrapper({
  statusReport,
  onEditComplete,
  statusReportComponent
}: EditStatusReportWrapperProps) {
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
      formData.append('id', statusReport.id.toString());
      formData.append('groupId', data.groupId);
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('reporterFirstName', data.reporterFirstName);
      formData.append('reporterLastName', data.reporterLastName);
      
      // Add status if present
      if (data.status) {
        formData.append('status', data.status);
      }

      // Process existing file URLs - this should be done in the form and passed here
      // Get existing file URLs from the form component
      const existingFileUrls = document.querySelectorAll('[data-file-url]');
      if (existingFileUrls.length > 0) {
        const urls = Array.from(existingFileUrls).map(el => el.getAttribute('data-file-url'));
        formData.append('existingFileUrls', JSON.stringify(urls.filter(Boolean)));
      }

      // Append new files
      if (files.length > 0) {
        files.forEach((file, index) => {
          formData.append(`file-${index}`, file);
        });
        formData.append('fileCount', files.length.toString());
      }

      // Call API to update status report
      const response = await fetch('/api/admin/status-reports', {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status report');
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
      console.error('Error updating status report:', err);
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
        
        <EditStatusReportForm
          statusReport={statusReport}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </Box>
    );
  }

  // Otherwise show the regular status report view with edit button
  return (
    <Box>
      {/* Display status report component */}
      {statusReportComponent}
      
      {/* Edit button */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleEditToggle}
        >
          Bearbeiten
        </Button>
      </Box>
    </Box>
  );
}