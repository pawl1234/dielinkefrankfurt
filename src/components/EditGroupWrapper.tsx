'use client';

import { useState } from 'react';
import GroupEditForm from './GroupEditForm';
import { Box, Button, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Group, ResponsiblePerson } from '@prisma/client';

interface EditGroupWrapperProps {
  group: Group & {
    responsiblePersons: ResponsiblePerson[];
  };
  onEditComplete?: () => void;
  groupComponent: React.ReactNode;
}

export default function EditGroupWrapper({
  group,
  onEditComplete,
  groupComponent
}: EditGroupWrapperProps) {
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

  const handleSubmitSuccess = () => {
    setIsEditing(false);
    
    // Wait a short time before refreshing to allow database updates to complete
    setTimeout(() => {
      if (onEditComplete) {
        console.log("Calling onEditComplete to refresh the view...");
        onEditComplete();
      }
    }, 500);
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
        
        <GroupEditForm
          group={group}
          onSubmitSuccess={handleSubmitSuccess}
          onCancel={handleCancel}
        />
      </Box>
    );
  }

  // Otherwise show the regular group view with edit button
  return (
    <Box>
      {/* Render the provided group component */}
      {groupComponent}
      
      {/* Hidden button for programmatic access */}
      <Button 
        sx={{ display: 'none' }}
        data-group-id={group.id}
        onClick={handleEditToggle}
      />
    </Box>
  );
}