import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { put, del } from '@vercel/blob';
import prisma from '@/lib/prisma';
import { 
  createNextRequest, 
  createMockFormData,
  mockAuthenticatedAdminUser,
  mockUnauthenticatedUser 
} from '../test-utils';
import {
  createMockAppointmentFormData,
  createMockGroupFormData,
  createMockStatusReportFormData
} from '../factories';

// Types for form data
type AppointmentFormData = ReturnType<typeof createMockAppointmentFormData>;
type GroupFormData = ReturnType<typeof createMockGroupFormData>;
type StatusReportFormData = ReturnType<typeof createMockStatusReportFormData>;

// Import API route handlers dynamically to avoid circular dependencies
let appointmentSubmitHandler: (request: NextRequest) => Promise<Response>;
let groupSubmitHandler: (request: NextRequest) => Promise<Response>;
let statusReportSubmitHandler: (request: NextRequest) => Promise<Response>;
let appointmentUpdateHandler: (request: NextRequest) => Promise<Response>;
let groupUpdateHandler: (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;
let statusReportUpdateHandler: (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;
let statusReportStatusHandler: (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;

// Initialize handlers on first use
async function initializeHandlers() {
  if (!appointmentSubmitHandler) {
    const appointmentModule = await import('@/app/api/appointments/submit/route');
    appointmentSubmitHandler = appointmentModule.POST;
  }
  if (!groupSubmitHandler) {
    const groupModule = await import('@/app/api/groups/submit/route');
    groupSubmitHandler = groupModule.POST;
  }
  if (!statusReportSubmitHandler) {
    const statusReportModule = await import('@/app/api/status-reports/submit/route');
    statusReportSubmitHandler = statusReportModule.POST;
  }
  if (!appointmentUpdateHandler) {
    const appointmentAdminModule = await import('@/app/api/admin/appointments/route');
    appointmentUpdateHandler = appointmentAdminModule.PATCH;
  }
  if (!groupUpdateHandler) {
    const groupAdminModule = await import('@/app/api/admin/groups/[id]/route');
    groupUpdateHandler = groupAdminModule.PUT;
  }
  if (!statusReportUpdateHandler) {
    const statusReportAdminModule = await import('@/app/api/admin/status-reports/[id]/route');
    statusReportUpdateHandler = statusReportAdminModule.PUT;
  }
  if (!statusReportStatusHandler) {
    const statusReportStatusModule = await import('@/app/api/admin/status-reports/[id]/status/route');
    statusReportStatusHandler = statusReportStatusModule.PUT;
  }
}

// ============================================
// 1. Form Submission Helpers
// ============================================

export async function submitAppointmentForm(
  data: Partial<AppointmentFormData> = {},
  files?: { coverImage?: File; attachments?: File[] }
): Promise<{ response: Response; data?: any }> {
  await initializeHandlers();
  
  const formData = createMockAppointmentFormData(data);
  const form = createMockFormData(formData);
  
  // Add files if provided
  if (files?.coverImage) {
    form.append('coverImage', files.coverImage);
  }
  if (files?.attachments) {
    files.attachments.forEach((file, index) => {
      form.append(`file-${index}`, file);
    });
    form.append('fileCount', String(files.attachments.length));
  }
  
  const request = createNextRequest('http://localhost:3000/api/appointments/submit', 'POST', form);
  const response = await appointmentSubmitHandler(request);
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // Response might not be JSON
  }
  
  return { response, data: responseData };
}

export async function submitGroupRequestForm(
  data: Partial<GroupFormData> = {},
  logoFile?: File
): Promise<{ response: Response; data?: any }> {
  await initializeHandlers();
  
  const formData = createMockGroupFormData(data);
  const form = new FormData();
  
  // Add form fields
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'responsiblePersons') {
        // Handle responsible persons specially - parse JSON and add as individual fields
        let persons = [];
        if (typeof value === 'string' && value.trim()) {
          try {
            persons = JSON.parse(value);
          } catch (e) {
            // Invalid JSON, treat as empty array
          }
        } else if (Array.isArray(value)) {
          persons = value;
        }
        
        form.append('responsiblePersonsCount', String(persons.length));
        if (Array.isArray(persons)) {
          persons.forEach((person: any, index: number) => {
            form.append(`responsiblePerson[${index}].firstName`, person.firstName);
            form.append(`responsiblePerson[${index}].lastName`, person.lastName);
            form.append(`responsiblePerson[${index}].email`, person.email);
          });
        }
      } else {
        form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
  });
  
  // Add logo if provided
  if (logoFile) {
    form.append('logo', logoFile);
    // Also add a cropped version - the API expects both files
    form.append('croppedLogo', logoFile);
  }
  
  const request = createNextRequest('http://localhost:3000/api/groups/submit', 'POST', form);
  const response = await groupSubmitHandler(request);
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // Response might not be JSON
  }
  
  return { response, data: responseData };
}

export async function submitStatusReportForm(
  data: Partial<StatusReportFormData> = {},
  files?: File[]
): Promise<{ response: Response; data?: any }> {
  await initializeHandlers();
  
  const formData = createMockStatusReportFormData(data.groupId, data);
  const form = createMockFormData(formData);
  
  // Add files if provided
  if (files) {
    files.forEach((file, index) => {
      form.append(`file-${index}`, file);
    });
    form.append('fileCount', String(files.length));
  }
  
  const request = createNextRequest('http://localhost:3000/api/status-reports/submit', 'POST', form);
  const response = await statusReportSubmitHandler(request);
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // Response might not be JSON
  }
  
  return { response, data: responseData };
}

// ============================================
// 2. Admin Action Helpers
// ============================================

export async function approveItem(
  type: 'appointment' | 'group' | 'statusReport',
  id: string | number
): Promise<{ response: Response; data?: any }> {
  await initializeHandlers();
  
  // Don't override authentication - respect current test state
  
  let handler: any;
  let url: string;
  let updateData: any;
  let method: string;
  
  switch (type) {
    case 'appointment':
      handler = appointmentUpdateHandler;
      url = `http://localhost:3000/api/admin/appointments`;
      method = 'PATCH';
      updateData = {
        id: typeof id === 'string' ? Number(id) : id,
        status: 'accepted',
        processed: true,
        processingDate: new Date().toISOString()
      };
      break;
    case 'group':
      handler = groupUpdateHandler;
      url = `http://localhost:3000/api/admin/groups/${id}`;
      method = 'PUT';
      updateData = { status: 'ACTIVE' };
      break;
    case 'statusReport':
      handler = statusReportUpdateHandler;
      url = `http://localhost:3000/api/admin/status-reports/${id}`;
      method = 'PUT';
      updateData = { status: 'ACTIVE' };
      break;
  }
  
  const request = createNextRequest(url, method, updateData);
  const response = type === 'appointment' 
    ? await handler(request)
    : await handler(request, { params: Promise.resolve({ id: String(id) }) });
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // Response might not be JSON
  }
  
  return { response, data: responseData };
}

export async function rejectItem(
  type: 'appointment' | 'group' | 'statusReport',
  id: string | number,
  reason?: string
): Promise<{ response: Response; data?: any }> {
  await initializeHandlers();
  
  // Don't override authentication - respect current test state
  
  let handler: any;
  let url: string;
  let updateData: any;
  let method: string;
  
  switch (type) {
    case 'appointment':
      handler = appointmentUpdateHandler;
      url = `http://localhost:3000/api/admin/appointments`;
      method = 'PATCH';
      updateData = {
        id: typeof id === 'string' ? Number(id) : id,
        status: 'rejected',
        processed: true,
        processingDate: new Date().toISOString(),
        rejectionReason: reason || 'Does not meet guidelines'
      };
      break;
    case 'group':
      handler = groupUpdateHandler;
      url = `http://localhost:3000/api/admin/groups/${id}`;
      method = 'PUT';
      updateData = { 
        status: 'REJECTED',
        rejectionReason: reason 
      };
      break;
    case 'statusReport':
      handler = statusReportUpdateHandler;
      url = `http://localhost:3000/api/admin/status-reports/${id}`;
      method = 'PUT';
      updateData = { 
        status: 'REJECTED',
        rejectionReason: reason 
      };
      break;
  }
  
  const request = createNextRequest(url, method, updateData);
  const response = type === 'appointment' 
    ? await handler(request)
    : await handler(request, { params: Promise.resolve({ id: String(id) }) });
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // Response might not be JSON
  }
  
  return { response, data: responseData };
}

export async function archiveGroup(id: string): Promise<{ response: Response; data?: any }> {
  await initializeHandlers();
  
  // Don't override authentication - respect current test state
  
  const request = createNextRequest(
    `http://localhost:3000/api/admin/groups/${id}`,
    'PUT',
    { status: 'ARCHIVED' }
  );
  
  const response = await groupUpdateHandler(request, { params: { id } });
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // Response might not be JSON
  }
  
  return { response, data: responseData };
}

// ============================================
// 3. File Upload Helpers
// ============================================

export async function mockFileUploadSuccess(url: string = 'https://example.com/uploaded-file.jpg'): Promise<void> {
  // Mock successful file upload to Vercel Blob
  (put as jest.Mock).mockResolvedValueOnce({ url });
}

export function mockCroppedImagePairUpload(originalUrl: string, croppedUrl: string): void {
  // Mock both calls that uploadCroppedImagePair makes
  (put as jest.Mock).mockResolvedValueOnce({ url: originalUrl });
  (put as jest.Mock).mockResolvedValueOnce({ url: croppedUrl });
}

export async function mockFileUploadFailure(error: string = 'Upload failed'): Promise<void> {
  // Mock failed file upload for both calls (original and cropped)
  (put as jest.Mock).mockRejectedValue(new Error(error));
}

export function mockMultipleFileUploads(urls: string[]): void {
  // Mock multiple successful file uploads
  urls.forEach(url => {
    (put as jest.Mock).mockResolvedValueOnce({ url });
  });
}

export function resetFileUploadMocks(): void {
  // Reset all file upload mocks
  (put as jest.Mock).mockReset();
  (del as jest.Mock).mockReset();
}

// ============================================
// 4. Authentication Helpers
// ============================================

export function loginAsAdmin(): void {
  mockAuthenticatedAdminUser();
}

export function logoutAdmin(): void {
  mockUnauthenticatedUser();
}

export function setCustomAuthUser(user: { role?: string; name?: string; email?: string } | null): void {
  (getToken as jest.Mock).mockResolvedValue(user);
}

// ============================================
// Utility Functions
// ============================================

export async function waitForEmailQueue(): Promise<void> {
  // Give time for async email operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
}

export function clearAllMocks(): void {
  jest.clearAllMocks();
  resetFileUploadMocks();
}

// Helper to assert response status and return data
export async function assertSuccessResponse(response: Response): Promise<any> {
  expect(response.status).toBe(200);
  return response.json();
}

export async function assertErrorResponse(response: Response, expectedStatus: number = 400): Promise<any> {
  expect(response.status).toBe(expectedStatus);
  return response.json();
}

// Database state helpers
export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({ where: { id } });
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({ 
    where: { id },
    include: { responsiblePersons: true }
  });
}

export async function getStatusReportById(id: string) {
  return prisma.statusReport.findUnique({ 
    where: { id },
    include: { group: true }
  });
}

// Cleanup helpers
export async function cleanupTestAppointment(id: string) {
  try {
    await prisma.appointment.delete({ where: { id } });
  } catch (e) {
    // Ignore if already deleted
  }
}

export async function cleanupTestGroup(id: string) {
  try {
    // Delete responsible persons first
    await prisma.responsiblePerson.deleteMany({ where: { groupId: id } });
    // Then delete the group
    await prisma.group.delete({ where: { id } });
  } catch (e) {
    // Ignore if already deleted
  }
}

export async function cleanupTestStatusReport(id: string) {
  try {
    await prisma.statusReport.delete({ where: { id } });
  } catch (e) {
    // Ignore if already deleted
  }
}