import { NextRequest } from 'next/server';
import { withAdminAuth, verifyAdminAccess } from '@/lib/api-auth';
import { getToken } from 'next-auth/jwt';

// Mock next-auth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

describe('API Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('verifyAdminAccess', () => {
    it('should return null for authenticated admin users', async () => {
      // Mock an authenticated admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      const mockRequest = new NextRequest('https://example.com/api/admin/groups');
      const result = await verifyAdminAccess(mockRequest);
      
      expect(result).toBeNull();
      expect(getToken).toHaveBeenCalledWith({
        req: mockRequest,
        secret: process.env.NEXTAUTH_SECRET
      });
    });
    
    it('should return 401 response for non-admin users', async () => {
      // Mock a non-admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'user',
        name: 'Regular User'
      });
      
      const mockRequest = new NextRequest('https://example.com/api/admin/groups');
      const result = await verifyAdminAccess(mockRequest);
      
      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });
    
    it('should return 401 response for unauthenticated users', async () => {
      // Mock no token (unauthenticated)
      (getToken as jest.Mock).mockResolvedValue(null);
      
      const mockRequest = new NextRequest('https://example.com/api/admin/groups');
      const result = await verifyAdminAccess(mockRequest);
      
      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });
  });
  
  describe('withAdminAuth', () => {
    it('should call the handler for authenticated admin users', async () => {
      // Mock an authenticated admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Create mock handler
      const mockHandler = jest.fn().mockResolvedValue(new Response('Success'));
      const protectedHandler = withAdminAuth(mockHandler);
      
      // Call the protected handler
      const mockRequest = new NextRequest('https://example.com/api/admin/groups');
      await protectedHandler(mockRequest);
      
      // Verify the handler was called
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    });
    
    it('should not call the handler for non-admin users', async () => {
      // Mock a non-admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'user',
        name: 'Regular User'
      });
      
      // Create mock handler
      const mockHandler = jest.fn().mockResolvedValue(new Response('Success'));
      const protectedHandler = withAdminAuth(mockHandler);
      
      // Call the protected handler
      const mockRequest = new NextRequest('https://example.com/api/admin/groups');
      const response = await protectedHandler(mockRequest);
      
      // Verify the handler was not called and a 401 was returned
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
    
    it('should not call the handler for unauthenticated users', async () => {
      // Mock no token (unauthenticated)
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // Create mock handler
      const mockHandler = jest.fn().mockResolvedValue(new Response('Success'));
      const protectedHandler = withAdminAuth(mockHandler);
      
      // Call the protected handler
      const mockRequest = new NextRequest('https://example.com/api/admin/groups');
      const response = await protectedHandler(mockRequest);
      
      // Verify the handler was not called and a 401 was returned
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });
});