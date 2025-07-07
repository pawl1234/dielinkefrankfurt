import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { put } from '@vercel/blob';
import { POST } from '@/app/api/appointments/submit/route';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

describe('Appointment Submission API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock external dependencies only
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Test Event',
      status: 'pending',
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    (put as jest.Mock).mockResolvedValue({ url: 'https://example.com/test-file.jpg' });
    (sendEmail as jest.Mock).mockResolvedValue(true);
  });

  const createFormData = (overrides: Record<string, any> = {}) => {
    const formData = new FormData();
    const defaults = {
      title: 'Test Event',
      mainText: '<p>Test description</p>',
      startDateTime: new Date('2025-07-01T19:00:00').toISOString(),
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    };
    
    Object.entries({ ...defaults, ...overrides }).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    return formData;
  };

  const submitForm = async (formData: FormData) => {
    const request = new Request('http://localhost:3000/api/appointments/submit', {
      method: 'POST',
      body: formData
    });
    
    return await POST(request);
  };

  describe('Valid Submissions', () => {
    it('should create appointment with required fields', async () => {
      const formData = createFormData();
      
      const response = await submitForm(formData);
      
      expect(response.status).toBe(200);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Event',
          mainText: '<p>Test description</p>',
          firstName: 'Test',
          lastName: 'User',
          status: 'pending'
        })
      });
    });

    it('should handle location fields', async () => {
      const formData = createFormData({
        street: 'Hauptstraße 42',
        city: 'Frankfurt',
        state: 'Hessen',
        postalCode: '60311'
      });
      
      const response = await submitForm(formData);
      
      expect(response.status).toBe(200);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          street: 'Hauptstraße 42',
          city: 'Frankfurt',
          state: 'Hessen',
          postalCode: '60311'
        })
      });
    });

    it('should handle file uploads', async () => {
      const formData = createFormData();
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('fileCount', '1');
      formData.append('file-0', file);
      
      const response = await submitForm(formData);
      
      expect(response.status).toBe(200);
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.any(Blob),
        expect.objectContaining({ access: 'public' })
      );
    });

  });

  describe('Error Handling', () => {
    it('should handle malformed request data', async () => {
      const request = new Request('http://localhost:3000/api/appointments/submit', {
        method: 'POST',
        body: 'invalid-data'
      });
      
      const response = await POST(request);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });






    it('should handle database failures', async () => {
      (prisma.appointment.create as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );
      
      const formData = createFormData();
      const response = await submitForm(formData);
      
      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it('should handle file upload failures', async () => {
      (put as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));
      
      const formData = createFormData();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      formData.append('fileCount', '1');
      formData.append('file-0', file);
      
      const response = await submitForm(formData);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });


  });
});