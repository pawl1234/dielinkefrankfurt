'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Chip,
  Stack,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  UploadFile as UploadFileIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import AdminNavigation from '@/components/AdminNavigation';
import { StatusReport, Group, StatusReportStatus } from '@prisma/client';
import RichTextEditor from '@/components/RichTextEditor';
import FileUpload from '@/components/FileUpload';

export default function EditStatusReport({ params }: { params: { id: string } }) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [status, setStatus] = useState<StatusReportStatus>('NEW');
  const [reporterFirstName, setReporterFirstName] = useState<string>('');
  const [reporterLastName, setReporterLastName] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedFileUrls, setRemovedFileUrls] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  // Check authentication status
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [sessionStatus, router]);

  // Fetch status report data and groups when component mounts
  useEffect(() => {
    if (sessionStatus === 'authenticated' && params.id) {
      fetchStatusReport();
      fetchGroups();
    }
  }, [params.id, sessionStatus]);

  // Function to fetch status report details
  const fetchStatusReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const res = await fetch(`/api/admin/status-reports/${params.id}?t=${timestamp}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch status report');
      }
      
      const data = await res.json();
      
      // Populate form fields with fetched data
      setTitle(data.title);
      setContent(data.content);
      setStatus(data.status);
      setReporterFirstName(data.reporterFirstName);
      setReporterLastName(data.reporterLastName);
      setGroupId(data.groupId);
      
      // Parse file URLs if they exist
      if (data.fileUrls) {
        try {
          const urls = JSON.parse(data.fileUrls);
          setFileUrls(Array.isArray(urls) ? urls : []);
        } catch (e) {
          console.error('Error parsing file URLs:', e);
          setFileUrls([]);
        }
      }
    } catch (err) {
      setError('Error loading status report. Please try again.');
      console.error('Error fetching status report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch active groups
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/groups?status=ACTIVE');
      
      if (!res.ok) {
        throw new Error('Failed to fetch groups');
      }
      
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
      // Don't set error state to avoid blocking the main form
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Prepare form data to handle file uploads
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('status', status);
      formData.append('reporterFirstName', reporterFirstName);
      formData.append('reporterLastName', reporterLastName);
      
      // Add file count and files
      formData.append('fileCount', newFiles.length.toString());
      newFiles.forEach((file, i) => {
        formData.append(`file-${i}`, file);
      });
      
      // Calculate final file URLs to keep
      const currentFileUrls = fileUrls.filter(url => !removedFileUrls.includes(url));
      
      // Use flag to indicate whether to retain existing files
      formData.append('retainExistingFiles', 'true');
      
      // Make API request to update the status report
      const res = await fetch(`/api/admin/status-reports/${params.id}`, {
        method: 'PUT',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status report');
      }
      
      const data = await res.json();
      
      // Show success message
      setSuccessMessage('Status report updated successfully!');
      
      // Reset the removed files list since changes are now saved
      setRemovedFileUrls([]);
      
      // Refresh file URLs from response
      if (data.statusReport.fileUrls) {
        try {
          const urls = JSON.parse(data.statusReport.fileUrls);
          setFileUrls(Array.isArray(urls) ? urls : []);
        } catch (e) {
          console.error('Error parsing updated file URLs:', e);
        }
      }
      
      // Reset new files list
      setNewFiles([]);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err) {
      console.error('Error updating status report:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle file upload
  const handleFilesAdded = (files: File[]) => {
    setNewFiles(prev => [...prev, ...files]);
  };

  // Handle removing a new file before upload
  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle removing an existing file
  const handleRemoveExistingFile = (url: string) => {
    setRemovedFileUrls(prev => [...prev, url]);
  };

  // Extract filename from file URL
  const getFilename = (url: string) => {
    return url.split('/').pop() || 'file';
  };

  // Check if it's an image file by extension
  const isImageFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  // Handle delete status report
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/status-reports/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete status report');
      }
      
      // Close dialog
      setDeleteDialogOpen(false);
      
      // Show success message briefly
      setSuccessMessage('Status report deleted successfully!');
      
      // Redirect to status reports list after a short delay
      setTimeout(() => {
        router.push('/admin/status-reports');
      }, 1500);
      
    } catch (err) {
      console.error('Error deleting status report:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete status report. Please try again.');
      setDeleteDialogOpen(false);
    }
  };

  // If not authenticated, show loading state
  if (sessionStatus !== 'authenticated') {
    return (
      <MainLayout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Edit Status Report" breadcrumbs={[
      { label: 'Admin', href: '/admin' },
      { label: 'Status Reports', href: '/admin/status-reports' },
      { label: 'Edit', href: `/admin/status-reports/${params.id}/edit` }
    ]}>
      <Container maxWidth="lg">
        {/* Admin Navigation */}
        <AdminNavigation />
        
        <Paper sx={{ p: 3, mb: 4 }}>
          {/* Back button */}
          <Button
            component={Link}
            href={`/admin/status-reports/${params.id}`}
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            Back to Details
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            Edit Status Report
          </Typography>
          
          {/* Loading indicator */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Error message */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              {/* Success message */}
              {successMessage && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {successMessage}
                </Alert>
              )}
              
              <Grid container spacing={3}>
                {/* Title field */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Report Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                    required
                    error={!title}
                    helperText={!title && 'Title is required'}
                  />
                </Grid>
                
                {/* Group select */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel id="group-select-label">Group</InputLabel>
                    <Select
                      labelId="group-select-label"
                      id="group-select"
                      value={groupId}
                      label="Group"
                      disabled // Can't change group
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Status select */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      id="status-select"
                      value={status}
                      label="Status"
                      onChange={(e) => setStatus(e.target.value as StatusReportStatus)}
                    >
                      <MenuItem value="NEW">New</MenuItem>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="REJECTED">Rejected</MenuItem>
                      <MenuItem value="ARCHIVED">Archived</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Reporter first name */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Reporter First Name"
                    value={reporterFirstName}
                    onChange={(e) => setReporterFirstName(e.target.value)}
                    fullWidth
                    required
                    error={!reporterFirstName}
                    helperText={!reporterFirstName && 'First name is required'}
                  />
                </Grid>
                
                {/* Reporter last name */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Reporter Last Name"
                    value={reporterLastName}
                    onChange={(e) => setReporterLastName(e.target.value)}
                    fullWidth
                    required
                    error={!reporterLastName}
                    helperText={!reporterLastName && 'Last name is required'}
                  />
                </Grid>
                
                {/* Report content */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Report Content
                  </Typography>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Enter report content here..."
                    minHeight={250}
                  />
                </Grid>
                
                {/* Existing file attachments */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Current Attachments
                  </Typography>
                  
                  {fileUrls.length > 0 ? (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {fileUrls.map((url, index) => {
                        const filename = getFilename(url);
                        const isImage = isImageFile(filename);
                        
                        // Skip files that are marked for removal
                        if (removedFileUrls.includes(url)) return null;
                        
                        return (
                          <Chip
                            key={index}
                            label={filename}
                            onDelete={() => handleRemoveExistingFile(url)}
                            deleteIcon={<DeleteIcon />}
                            icon={isImage ? <AttachFileIcon /> : <AttachFileIcon />}
                            variant="outlined"
                            clickable
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          />
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No attachments
                    </Typography>
                  )}
                </Grid>
                
                {/* Upload new files */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Add New Attachments
                  </Typography>
                  
                  <FileUpload
                    onFilesAdded={handleFilesAdded}
                    maxFileSize={5 * 1024 * 1024} // 5MB
                    allowedFileTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
                    multiple
                  />
                  
                  {/* Show new files to be uploaded */}
                  {newFiles.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Files to Upload
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {newFiles.map((file, index) => (
                          <Chip
                            key={index}
                            label={file.name}
                            onDelete={() => handleRemoveNewFile(index)}
                            deleteIcon={<DeleteIcon />}
                            icon={<UploadFileIcon />}
                            variant="outlined"
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Grid>
                
                {/* Form buttons */}
                <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Status Report
                  </Button>
                  
                  <Box>
                    <Button
                      type="button"
                      variant="outlined"
                      component={Link}
                      href={`/admin/status-reports/${params.id}`}
                      sx={{ mr: 2 }}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          )}
        </Paper>
      </Container>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this status report? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success message snackbar */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </MainLayout>
  );
}