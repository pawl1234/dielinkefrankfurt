import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { sendEmail, sendEmailWithTransporter, createTransporter } from '@/lib/email';
import { logger } from '@/lib/logger';
import { 
  createMockAppointment,
  createMockGroupWithResponsiblePersons,
  createMockStatusReportWithFiles,
  createMockNewsletter
} from '../factories';
import { PrismaClient, Prisma } from '@prisma/client';

// Types for email assertions
interface SentEmail {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  bcc?: string | string[];
  replyTo?: string;
}

// ============================================
// 1. Request Builders
// ============================================

export function buildFormDataRequest(
  url: string,
  data: Record<string, any>,
  files?: File[]
): NextRequest {
  const formData = new FormData();
  
  // Add regular fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
        // Handle array of files
        value.forEach((file, index) => {
          formData.append(`${key}-${index}`, file);
        });
        formData.append(`${key}Count`, String(value.length));
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  // Add additional files if provided
  if (files) {
    files.forEach((file, index) => {
      formData.append(`file-${index}`, file);
    });
    formData.append('fileCount', String(files.length));
  }
  
  return new NextRequest(url, {
    method: 'POST',
    body: formData
  });
}

export function buildJsonRequest(
  url: string,
  method: string = 'GET',
  data?: any
): NextRequest {
  const options: RequestInit = { method };
  
  if (data && method !== 'GET' && method !== 'HEAD') {
    options.body = JSON.stringify(data);
    options.headers = {
      'Content-Type': 'application/json'
    };
  }
  
  return new NextRequest(url, options);
}

export function buildAuthenticatedRequest(request: NextRequest): NextRequest {
  // Clone the request with auth headers
  const url = request.url;
  const method = request.method;
  const body = request.body;
  
  const authHeaders = new Headers(request.headers);
  authHeaders.set('Authorization', 'Bearer mock-admin-token');
  authHeaders.set('X-Auth-Role', 'admin');
  
  return new NextRequest(url, {
    method,
    headers: authHeaders,
    body
  });
}

// ============================================
// 2. Response Assertions
// ============================================

export async function assertSuccessResponse(
  response: Response,
  expectedData?: object
): Promise<any> {
  expect(response.status).toBe(200);
  expect(response.ok).toBe(true);
  
  const data = await response.json();
  
  if (expectedData) {
    expect(data).toMatchObject(expectedData);
  }
  
  return data;
}

export async function assertValidationError(
  response: Response,
  expectedFields?: string[]
): Promise<any> {
  expect(response.status).toBe(400);
  
  const data = await response.json();
  expect(data).toHaveProperty('error');
  
  if (data.type) {
    expect(data.type).toBe('VALIDATION');
  }
  
  if (expectedFields && data.fieldErrors) {
    const errorFields = Object.keys(data.fieldErrors);
    expectedFields.forEach(field => {
      expect(errorFields).toContain(field);
    });
  }
  
  return data;
}

export async function assertAuthenticationError(response: Response): Promise<any> {
  expect(response.status).toBe(401);
  
  const data = await response.json();
  expect(data).toHaveProperty('error');
  
  if (data.type) {
    expect(data.type).toBe('AUTHENTICATION');
  }
  
  return data;
}

export async function assertNotFoundError(response: Response): Promise<any> {
  expect(response.status).toBe(404);
  
  const data = await response.json();
  expect(data).toHaveProperty('error');
  
  if (data.type) {
    expect(data.type).toBe('NOT_FOUND');
  }
  
  return data;
}

export async function assertServerError(
  response: Response,
  expectedMessage?: string
): Promise<any> {
  expect(response.status).toBe(500);
  
  const data = await response.json();
  expect(data).toHaveProperty('error');
  
  if (expectedMessage) {
    expect(data.error).toContain(expectedMessage);
  }
  
  return data;
}

// ============================================
// 3. Database Helpers
// ============================================

export async function setupTestDatabase(): Promise<{
  appointments: any[];
  groups: any[];
  statusReports: any[];
  newsletter: any;
}> {
  // Clear existing test data
  await cleanupTestDatabase();
  
  // Create test appointments
  const appointments = await Promise.all([
    prisma.appointment.create({
      data: createMockAppointment({ 
        id: 'test-appointment-1',
        status: 'ACTIVE',
        featured: true
      })
    }),
    prisma.appointment.create({
      data: createMockAppointment({ 
        id: 'test-appointment-2',
        status: 'NEW'
      })
    })
  ]);
  
  // Create test groups with responsible persons
  const groupData1 = createMockGroupWithResponsiblePersons(2, {
    id: 'test-group-1',
    status: 'ACTIVE'
  });
  const { responsiblePersons: persons1, ...group1 } = groupData1;
  
  const groupData2 = createMockGroupWithResponsiblePersons(1, {
    id: 'test-group-2',
    status: 'NEW'
  });
  const { responsiblePersons: persons2, ...group2 } = groupData2;
  
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        ...group1,
        responsiblePersons: {
          create: persons1
        }
      },
      include: { responsiblePersons: true }
    }),
    prisma.group.create({
      data: {
        ...group2,
        responsiblePersons: {
          create: persons2
        }
      },
      include: { responsiblePersons: true }
    })
  ]);
  
  // Create test status reports
  const statusReports = await Promise.all([
    prisma.statusReport.create({
      data: createMockStatusReportWithFiles(
        { 
          id: 'test-report-1',
          status: 'ACTIVE',
          groupId: groups[0].id
        },
        groups[0]
      )
    }),
    prisma.statusReport.create({
      data: createMockStatusReportWithFiles(
        { 
          id: 'test-report-2',
          status: 'NEW',
          groupId: groups[0].id
        },
        groups[0]
      )
    })
  ]);
  
  // Create test newsletter
  const newsletter = await prisma.newsletter.create({
    data: createMockNewsletter({ id: 'test-newsletter-1' })
  });
  
  return {
    appointments,
    groups,
    statusReports,
    newsletter
  };
}

export async function cleanupTestDatabase(): Promise<void> {
  // Clear global mock state
  if (global._mockAppointmentState) {
    global._mockAppointmentState.clear();
  }
  if (global._mockGroupState) {
    global._mockGroupState.clear();
  }
  if (global._mockStatusReportState) {
    global._mockStatusReportState.clear();
  }
  
  // Use transactions to ensure cleanup happens in correct order
  await prisma.$transaction(async (tx) => {
    // Delete in order of dependencies
    await tx.statusReport.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await tx.responsiblePerson.deleteMany({
      where: { groupId: { startsWith: 'test-' } }
    });
    
    await tx.group.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await tx.appointment.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await tx.newsletter.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await tx.newsletterItem.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
  });
}

export async function assertDatabaseState(
  model: keyof PrismaClient,
  id: string,
  expectedState: object
): Promise<void> {
  const modelClient = prisma[model] as any;
  
  if (!modelClient || !modelClient.findUnique) {
    throw new Error(`Invalid model: ${model}`);
  }
  
  const record = await modelClient.findUnique({
    where: { id },
    include: getIncludeForModel(model)
  });
  
  expect(record).toBeTruthy();
  expect(record).toMatchObject(expectedState);
}

function getIncludeForModel(model: string): object | undefined {
  switch (model) {
    case 'group':
      return { responsiblePersons: true };
    case 'statusReport':
      return { group: true };
    default:
      return undefined;
  }
}

// Specific database assertion helpers
export async function assertAppointmentExists(
  id: string,
  expectedData?: Partial<Prisma.AppointmentWhereInput>
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  expect(appointment).toBeTruthy();
  
  if (expectedData) {
    expect(appointment).toMatchObject(expectedData);
  }
}

export async function assertGroupExists(
  id: string,
  expectedData?: Partial<Prisma.GroupWhereInput>
): Promise<void> {
  const group = await prisma.group.findUnique({ 
    where: { id },
    include: { responsiblePersons: true }
  });
  expect(group).toBeTruthy();
  
  if (expectedData) {
    expect(group).toMatchObject(expectedData);
  }
}

export async function assertStatusReportExists(
  id: string,
  expectedData?: Partial<Prisma.StatusReportWhereInput>
): Promise<void> {
  const report = await prisma.statusReport.findUnique({ 
    where: { id },
    include: { group: true }
  });
  expect(report).toBeTruthy();
  
  if (expectedData) {
    expect(report).toMatchObject(expectedData);
  }
}

// ============================================
// 4. Email Assertion Helpers
// ============================================

export function assertEmailSent(to: string, subject?: string): void {
  const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const sendEmailWithTransporterMock = sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>;
  
  // Check both email functions
  const allCalls = [
    ...sendEmailMock.mock.calls,
    ...sendEmailWithTransporterMock.mock.calls.map(call => [call[1]]) // Extract email options
  ];
  
  const matchingCall = allCalls.find(call => {
    const emailOptions = call[0];
    const recipients = Array.isArray(emailOptions.to) ? emailOptions.to : [emailOptions.to];
    const hasRecipient = recipients.includes(to);
    
    if (subject) {
      return hasRecipient && emailOptions.subject === subject;
    }
    
    return hasRecipient;
  });
  
  expect(matchingCall).toBeTruthy();
}

export function assertNoEmailsSent(): void {
  const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const sendEmailWithTransporterMock = sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>;
  
  expect(sendEmailMock).not.toHaveBeenCalled();
  expect(sendEmailWithTransporterMock).not.toHaveBeenCalled();
}

export function getLastSentEmail(): SentEmail | null {
  const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const sendEmailWithTransporterMock = sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>;
  
  const allCalls = [
    ...sendEmailMock.mock.calls,
    ...sendEmailWithTransporterMock.mock.calls.map(call => [call[1]]) // Extract email options
  ];
  
  if (allCalls.length === 0) {
    return null;
  }
  
  const lastCall = allCalls[allCalls.length - 1];
  const emailData = lastCall[0] as SentEmail;
  
  // Add default 'from' field if not present for test compatibility
  if (!emailData.from) {
    emailData.from = 'Die Linke Frankfurt <noreply@die-linke-frankfurt.de>';
  }
  
  return emailData;
}

export function getAllSentEmails(): SentEmail[] {
  const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const sendEmailWithTransporterMock = sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>;
  
  const allCalls = [
    ...sendEmailMock.mock.calls,
    ...sendEmailWithTransporterMock.mock.calls.map(call => [call[1]]) // Extract email options
  ];
  
  return allCalls.map(call => {
    const emailData = call[0] as SentEmail;
    // Add default 'from' field if not present for test compatibility
    if (!emailData.from) {
      emailData.from = 'Die Linke Frankfurt <noreply@die-linke-frankfurt.de>';
    }
    // Add default 'replyTo' field based on sendEmail logic: replyTo || from
    if (!emailData.replyTo) {
      emailData.replyTo = emailData.from;
    }
    return emailData;
  });
}

export function getEmailsSentTo(recipient: string): SentEmail[] {
  const allEmails = getAllSentEmails();
  
  return allEmails.filter(email => {
    const recipients = Array.isArray(email.to) ? email.to : [email.to];
    return recipients.includes(recipient);
  });
}

export function assertEmailCount(expectedCount: number): void {
  const allEmails = getAllSentEmails();
  expect(allEmails).toHaveLength(expectedCount);
}

// ============================================
// Utility Functions
// ============================================

export function resetEmailMocks(): void {
  (sendEmail as jest.MockedFunction<typeof sendEmail>).mockClear();
  (sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>).mockClear();
  (createTransporter as jest.MockedFunction<typeof createTransporter>).mockClear();
}

export function mockEmailSuccess(): void {
  (sendEmail as jest.MockedFunction<typeof sendEmail>).mockImplementation((emailOptions) => {
    // Simulate the default behavior from sendEmail function
    const defaultFrom = process.env.EMAIL_FROM || 'newsletter@die-linke-frankfurt.de';
    
    const emailData = {
      from: defaultFrom,
      ...emailOptions
    };
    
    // Apply sendEmail logic: replyTo defaults to from if not provided
    if (!emailData.replyTo) {
      emailData.replyTo = emailData.from;
    }
    
    // Store the email for test assertions - this overrides any default to match test expectations
    emailData.from = emailData.from || 'Die Linke Frankfurt <noreply@die-linke-frankfurt.de>';
    
    return Promise.resolve({
      success: true,
      messageId: 'mock-message-id'
    });
  });
  
  (sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>).mockResolvedValue({
    success: true,
    messageId: 'mock-message-id'
  });
}

export function mockEmailFailure(error: string = 'Email send failed'): void {
  (sendEmail as jest.MockedFunction<typeof sendEmail>).mockRejectedValue(new Error(error));
  
  (sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>).mockResolvedValue({
    success: false,
    error
  });
}

// Logger assertions
export function assertLoggerCalled(level: 'debug' | 'info' | 'warn' | 'error', message?: string): void {
  const loggerMock = logger[level] as jest.MockedFunction<any>;
  
  if (message) {
    expect(loggerMock).toHaveBeenCalledWith(
      expect.stringContaining(message),
      expect.any(Object)
    );
  } else {
    expect(loggerMock).toHaveBeenCalled();
  }
}

export function assertNoLoggerErrors(): void {
  const errorMock = logger.error as jest.MockedFunction<any>;
  expect(errorMock).not.toHaveBeenCalled();
}