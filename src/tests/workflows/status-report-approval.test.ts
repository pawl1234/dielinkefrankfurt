import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PUT } from '@/app/api/admin/status-reports/[id]/route';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

describe('Status Report Approval API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock external dependencies
    (prisma.statusReport.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      title: 'Test Report',
      status: 'NEW',
      groupId: 'group-1',
      group: {
        id: 'group-1',
        status: 'ACTIVE',
        responsiblePersons: [
          { email: 'test1@example.com' },
          { email: 'test2@example.com' }
        ]
      }
    });
    
(prisma.statusReport.update as jest.Mock).mockResolvedValue({
      id: '1',
      status: 'ACTIVE'
    });
    
    (sendEmail as jest.Mock).mockResolvedValue(true);
  });

  const createRequest = (id: string, data: any) => {
    return new Request(`http://localhost:3000/api/admin/status-reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  };

  describe('Status Updates', () => {
    it('should approve status report', async () => {
      const request = createRequest('1', { status: 'ACTIVE' });
      
      const response = await PUT(request, { params: { id: '1' } });
      
      expect(response.status).toBe(200);
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
        include: expect.objectContaining({
          group: expect.objectContaining({
            include: { responsiblePersons: true }
          })
        })
      });
    });

    it('should reject status report', async () => {
      const request = createRequest('1', { status: 'REJECTED' });
      
      const response = await PUT(request, { params: { id: '1' } });
      
      expect(response.status).toBe(200);
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ status: 'REJECTED' }),
        include: expect.objectContaining({
          group: expect.objectContaining({
            include: { responsiblePersons: true }
          })
        })
      });
    });

    it('should update report content', async () => {
      const request = createRequest('1', {
        title: 'Updated Title',
        content: '<p>Updated content</p>'
      });
      
      const response = await PUT(request, { params: { id: '1' } });
      
      expect(response.status).toBe(200);
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          content: '<p>Updated content</p>'
        }),
        include: expect.objectContaining({
          group: expect.objectContaining({
            include: { responsiblePersons: true }
          })
        })
      });
    });




  });

  describe('Validation', () => {
    it('should prevent approval for inactive groups', async () => {
      (prisma.statusReport.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'NEW',
        group: { status: 'NEW' } // Inactive group
      });
      
      const request = createRequest('1', { status: 'ACTIVE' });
      
      const response = await PUT(request, { params: { id: '1' } });
      
      expect(response.status).toBe(400);
    });

    it('should handle non-existent reports', async () => {
      (prisma.statusReport.findUnique as jest.Mock).mockResolvedValue(null);
      
      const request = createRequest('999', { status: 'ACTIVE' });
      
      const response = await PUT(request, { params: { id: '999' } });
      
      expect(response.status).toBe(404);
    });

    it('should handle email failures gracefully', async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error('Email failed'));
      
      const request = createRequest('1', { status: 'ACTIVE' });
      
      const response = await PUT(request, { params: { id: '1' } });
      
      // Should still succeed despite email failure
      expect(response.status).toBe(200);
    });
  });
});