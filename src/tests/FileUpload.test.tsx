import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FileUpload from '../components/FileUpload';

// Mock File API for testing
class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;
  bytes: Uint8Array;
  
  constructor(bits: any, name: string, options: any = {}) {
    this.name = name;
    this.size = bits.length;
    this.type = options.type || 'application/octet-stream';
    this.lastModified = Date.now();
    this.webkitRelativePath = '';
    this.bytes = new Uint8Array(0);
  }
  
  slice() {
    return new Blob();
  }
  
  stream() {
    return new ReadableStream();
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0));
  }
  
  text() {
    return Promise.resolve('');
  }
}

// Assign the mock class to global.File
global.File = MockFile as unknown as typeof File;

// Mock the FileReader API
class FileReaderMock {
  onload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
  result: string | ArrayBuffer | null = null;
  
  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mockbase64data';
      if (this.onload) {
        const mockEvent = {
          target: { result: this.result }
        } as unknown as ProgressEvent<FileReader>;
        this.onload(mockEvent);
      }
    }, 0);
  }
}

// Replace global FileReader with our mock
global.FileReader = FileReaderMock as unknown as typeof FileReader;

describe('FileUpload Component', () => {
  const mockOnFilesSelect = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders upload box when no files are selected', () => {
    render(<FileUpload onFilesSelect={mockOnFilesSelect} maxFiles={5} />);
    
    expect(screen.getByText(/Dateien auswählen oder hierher ziehen/i)).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, PDF/i)).toBeInTheDocument();
  });
  
  it('shows an error for files that are too large', async () => {
    render(<FileUpload onFilesSelect={mockOnFilesSelect} maxFiles={5} />);
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('File input not found');
    
    // Create a mock large file (6MB)
    const largeFile = new File(new Array(6 * 1024 * 1024).fill('a'), 'large-file.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/überschreitet 5MB Limit/i)).toBeInTheDocument();
    });
    
    expect(mockOnFilesSelect).not.toHaveBeenCalled();
  });
  
  it('shows an error for unsupported file types', async () => {
    render(<FileUpload onFilesSelect={mockOnFilesSelect} maxFiles={5} />);
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('File input not found');
    
    // Create a mock unsupported file
    const exeFile = new File(['content'], 'test.exe', { type: 'application/exe' });
    
    fireEvent.change(input, { target: { files: [exeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Nicht unterstützter Dateityp/i)).toBeInTheDocument();
    });
    
    expect(mockOnFilesSelect).not.toHaveBeenCalled();
  });
  
  it('accepts valid image files and displays previews', async () => {
    render(<FileUpload onFilesSelect={mockOnFilesSelect} maxFiles={5} />);
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('File input not found');
    
    // Create a mock image file
    const imageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(input, { target: { files: [imageFile] } });
    
    await waitFor(() => {
      // The file name should be shown somewhere in the component
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    expect(mockOnFilesSelect).toHaveBeenCalled();
  });
  
  it('allows removing selected files', async () => {
    render(<FileUpload onFilesSelect={mockOnFilesSelect} maxFiles={5} />);
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('File input not found');
    
    // Create a mock image file
    const imageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(input, { target: { files: [imageFile] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    // Find and click the remove button
    const removeButton = screen.getByText('Entfernen');
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    });
    
    // The callback should be called with an empty array
    expect(mockOnFilesSelect).toHaveBeenCalledWith([]);
  });
});