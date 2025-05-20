import { Alert, Snackbar } from '@mui/material';
import React from 'react';

export interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface AdminNotificationProps {
  notification: NotificationState;
  onClose: () => void;
}

const AdminNotification: React.FC<AdminNotificationProps> = ({ notification, onClose }) => {
  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={notification.severity}>
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default AdminNotification;