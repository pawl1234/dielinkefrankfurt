// test-utils.ts - Testing utilities for Groups and Status Reports features
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Types
export type Group = {
  id: string;
  name: string;
  slug?: string;
  description: string;
  status: 'NEW' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  responsiblePersons: ResponsiblePerson[];
};

export type ResponsiblePerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  groupId: string;
};

export type StatusReport = {
  id: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status: 'NEW' | 'ACTIVE' | 'REJECTED';
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
  fileUrls: string | null;
  group: Group;
};

// Mock data generators
export function createMockGroup(overrides: Partial<Group> = {}): Group {
  const id = overrides.id || `group-${Math.floor(Math.random() * 1000)}`;
  return {
    id,
    name: overrides.name || 'Test Group',
    slug: overrides.slug || `test-group-${id}`,
    description: overrides.description || 'This is a test group description',
    status: overrides.status || 'NEW',
    logoUrl: overrides.logoUrl || null,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    responsiblePersons: overrides.responsiblePersons || [
      {
        id: `person-${Math.floor(Math.random() * 1000)}`,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        groupId: id
      }
    ]
  };
}

export function createMockStatusReport(overrides: Partial<StatusReport> = {}, group?: Group): StatusReport {
  const mockGroup = group || createMockGroup();
  const id = overrides.id || `report-${Math.floor(Math.random() * 1000)}`;
  
  return {
    id,
    title: overrides.title || 'Monthly Status Update',
    content: overrides.content || '<p>This is a test status report with <strong>formatted content</strong>.</p>',
    reporterFirstName: overrides.reporterFirstName || 'Jane',
    reporterLastName: overrides.reporterLastName || 'Smith',
    status: overrides.status || 'NEW',
    groupId: overrides.groupId || mockGroup.id,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    fileUrls: overrides.fileUrls || null,
    group: mockGroup
  };
}

// Mock file generators
export function createMockFile(name: string, type: string, size: number = 1024): File {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

export function createMockImageFile(name: string = 'test-image.jpg', size: number = 1024): File {
  return createMockFile(name, 'image/jpeg', size);
}

export function createMockPdfFile(name: string = 'test-document.pdf', size: number = 2048): File {
  return createMockFile(name, 'application/pdf', size);
}

// Authentication helpers
export function mockAuthenticatedAdminUser() {
  (getToken as jest.Mock).mockResolvedValue({
    role: 'admin',
    name: 'Admin User'
  });
}

export function mockUnauthenticatedUser() {
  (getToken as jest.Mock).mockResolvedValue(null);
}

// API request helpers
export function createNextRequest(url: string, method: string = 'GET', body?: unknown): NextRequest {
  const options: RequestInit = { method };
  
  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
      options.headers = {
        'Content-Type': 'application/json'
      };
    }
  }
  
  return new NextRequest(url, options);
}

// Mock form data creator
export function createMockFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value) && value[0] instanceof File) {
      value.forEach((file, index) => {
        formData.append(`${key}-${index}`, file);
      });
      formData.append(`${key}Count`, String(value.length));
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  
  return formData;
}

// Test assertion helpers
export function expectSuccessResponse(response: Response) {
  expect(response.status).toBe(200);
  return response.json();
}

export function expectErrorResponse(response: Response, status: number = 400) {
  expect(response.status).toBe(status);
  return response.json();
}

export function expectAuthenticationError(response: Response) {
  expect(response.status).toBe(401);
  return response.json();
}

export function expectNotFoundError(response: Response) {
  expect(response.status).toBe(404);
  return response.json();
}

export function expectServerError(response: Response) {
  expect(response.status).toBe(500);
  return response.json();
}