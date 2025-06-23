import { Newsletter } from '@prisma/client';
import { createMockNewsletter } from '../factories/newsletter.factory';

export const mockPrismaNewsletter = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaAppointment = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaStatusReport = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaGroup = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrisma = {
  newsletter: mockPrismaNewsletter,
  appointment: mockPrismaAppointment,
  statusReport: mockPrismaStatusReport,
  group: mockPrismaGroup,
};

// Helper functions to set up common mock scenarios
export function mockNewsletterNotFound() {
  mockPrismaNewsletter.findUnique.mockResolvedValue(null);
  mockPrismaNewsletter.findFirst.mockResolvedValue(null);
}

export function mockNewsletterExists(newsletter?: Newsletter) {
  const mockNewsletter = newsletter || createMockNewsletter();
  mockPrismaNewsletter.findUnique.mockResolvedValue(mockNewsletter);
  mockPrismaNewsletter.findFirst.mockResolvedValue(mockNewsletter);
}

export function mockNewsletterList(newsletters: Newsletter[]) {
  mockPrismaNewsletter.findMany.mockResolvedValue(newsletters);
  mockPrismaNewsletter.count.mockResolvedValue(newsletters.length);
}

export function mockNewsletterCreate(newsletter?: Newsletter) {
  const mockNewsletter = newsletter || createMockNewsletter();
  mockPrismaNewsletter.create.mockResolvedValue(mockNewsletter);
}

export function mockNewsletterUpdate(newsletter?: Newsletter) {
  const mockNewsletter = newsletter || createMockNewsletter();
  mockPrismaNewsletter.update.mockResolvedValue(mockNewsletter);
}

export function mockNewsletterDelete(newsletter?: Newsletter) {
  const mockNewsletter = newsletter || createMockNewsletter();
  mockPrismaNewsletter.delete.mockResolvedValue(mockNewsletter);
}

// Reset all mocks
export function resetPrismaMocks() {
  Object.values(mockPrisma).forEach(model => {
    Object.values(model).forEach(method => {
      if (typeof method === 'function' && 'mockReset' in method) {
        (method as jest.Mock).mockReset();
      }
    });
  });
}