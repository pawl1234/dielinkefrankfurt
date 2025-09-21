import { renderHook, act } from '@testing-library/react';
import { useImageLightbox } from '@/hooks/useImageLightbox';
import { FileAttachment } from '@/components/ui/FileThumbnail';

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
});

describe('useImageLightbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with closed lightbox', () => {
    const { result } = renderHook(() => useImageLightbox());

    expect(result.current.lightboxProps.open).toBe(false);
    expect(result.current.lightboxProps.imageUrl).toBe('');
    expect(result.current.lightboxProps.imageAlt).toBe('');
  });

  it('should open lightbox for image files', () => {
    const { result } = renderHook(() => useImageLightbox());

    const imageFile: FileAttachment = {
      url: 'https://example.com/image.jpg',
      type: 'image',
      name: 'test-image.jpg',
      description: 'Test image description'
    };

    act(() => {
      result.current.handleFileClick(imageFile);
    });

    expect(result.current.lightboxProps.open).toBe(true);
    expect(result.current.lightboxProps.imageUrl).toBe('https://example.com/image.jpg');
    expect(result.current.lightboxProps.imageAlt).toBe('Test image description');
  });

  it('should use name as alt text when description is not provided', () => {
    const { result } = renderHook(() => useImageLightbox());

    const imageFile: FileAttachment = {
      url: 'https://example.com/image.jpg',
      type: 'image',
      name: 'test-image.jpg'
    };

    act(() => {
      result.current.handleFileClick(imageFile);
    });

    expect(result.current.lightboxProps.imageAlt).toBe('test-image.jpg');
  });

  it('should use fallback alt text when neither description nor name is provided', () => {
    const { result } = renderHook(() => useImageLightbox());

    const imageFile: FileAttachment = {
      url: 'https://example.com/image.jpg',
      type: 'image'
    };

    act(() => {
      result.current.handleFileClick(imageFile);
    });

    expect(result.current.lightboxProps.imageAlt).toBe('Image');
  });

  it('should open PDF files in new tab', () => {
    const { result } = renderHook(() => useImageLightbox());

    const pdfFile: FileAttachment = {
      url: 'https://example.com/document.pdf',
      type: 'pdf',
      name: 'test-document.pdf'
    };

    act(() => {
      result.current.handleFileClick(pdfFile);
    });

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/document.pdf', '_blank');
    expect(result.current.lightboxProps.open).toBe(false);
  });

  it('should open other file types in new tab', () => {
    const { result } = renderHook(() => useImageLightbox());

    const otherFile: FileAttachment = {
      url: 'https://example.com/document.docx',
      type: 'other',
      name: 'test-document.docx'
    };

    act(() => {
      result.current.handleFileClick(otherFile);
    });

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/document.docx', '_blank');
    expect(result.current.lightboxProps.open).toBe(false);
  });

  it('should not open anything when file has no URL', () => {
    const { result } = renderHook(() => useImageLightbox());

    const fileWithoutUrl: FileAttachment = {
      type: 'image',
      name: 'test-image.jpg'
    };

    act(() => {
      result.current.handleFileClick(fileWithoutUrl);
    });

    expect(mockOpen).not.toHaveBeenCalled();
    expect(result.current.lightboxProps.open).toBe(false);
  });

  it('should close lightbox when onClose is called', () => {
    const { result } = renderHook(() => useImageLightbox());

    // First open the lightbox
    const imageFile: FileAttachment = {
      url: 'https://example.com/image.jpg',
      type: 'image',
      name: 'test-image.jpg'
    };

    act(() => {
      result.current.handleFileClick(imageFile);
    });

    expect(result.current.lightboxProps.open).toBe(true);

    // Then close it
    act(() => {
      result.current.lightboxProps.onClose();
    });

    expect(result.current.lightboxProps.open).toBe(false);
  });

  it('should maintain stable function references with useCallback', () => {
    const { result, rerender } = renderHook(() => useImageLightbox());

    const initialHandleFileClick = result.current.handleFileClick;
    const initialOnClose = result.current.lightboxProps.onClose;

    rerender();

    expect(result.current.handleFileClick).toBe(initialHandleFileClick);
    expect(result.current.lightboxProps.onClose).toBe(initialOnClose);
  });
});