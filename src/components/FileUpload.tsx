'use client';

import { useState, useEffect } from 'react';
import Uppy from '@uppy/core';
import { FileInput } from '@uppy/react';
import ThumbnailGenerator from '@uppy/thumbnail-generator';

interface FileUploadProps {
  onFileSelect: (file: File | Blob | null) => void;
}

const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [uppy, setUppy] = useState<Uppy | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const uppyInstance = new Uppy({
      id: 'cover-picture',
      restrictions: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxNumberOfFiles: 1,
      },
      autoProceed: true,
    });
    
    uppyInstance.use(ThumbnailGenerator, {
      thumbnailWidth: 400,
      waitForThumbnailsBeforeUpload: true,
    });
    
    uppyInstance.on('file-added', (file) => {
      setFileName(file.name || null);
      setFileType(file.type || null);
      onFileSelect(file.data);
      setError(null);
      
      if (file.type === 'application/pdf') {
        setPreview(null);
      }
    });
    
    uppyInstance.on('thumbnail:generated', (file, preview) => {
      if (file.type.includes('image')) {
        setPreview(preview);
      }
    });
    
    uppyInstance.on('restriction-failed', (file, error) => {
      if (error.message.includes('exceeds maximum allowed size')) {
        setError("File size exceeds 5MB limit. Please upload a smaller file.");
      } else if (error.message.includes('You can only upload')) {
        setError("Unsupported file type. Please upload a JPEG, PNG, or PDF.");
      } else {
        setError(error.message);
      }
      
      setPreview(null);
      setFileName(null);
      setFileType(null);
      onFileSelect(null);
    });
    
    setUppy(uppyInstance);
    
    return () => {
      uppyInstance.cancelAll();
    };
  }, [onFileSelect]);
  
  const handleReset = () => {
    if (uppy) {
      uppy.cancelAll();
    }
    setPreview(null);
    setFileName(null);
    setFileType(null);
    onFileSelect(null);
    setError(null);
  };
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Titelbild hochladen (JPEG, PNG, PDF, max. 5MB)
      </label>
      
      <div className="border border-gray-300 rounded p-4">
        {!fileName ? (
          <div>
            {uppy && <FileInput uppy={uppy} />}
            <p className="text-sm text-gray-500 mt-2">
              Für Bilder (JPEG/PNG) wird ein Seitenverhältnis von 4:3 empfohlen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{fileName}</span>
              <button 
                type="button" 
                onClick={handleReset}
                className="text-sm text-dark-teal hover:text-bright-teal"
              >
                Entfernen
              </button>
            </div>
            
            {preview && fileType && (fileType.includes('image')) && (
              <div className="relative">
                <div className="aspect-w-4 aspect-h-3 overflow-hidden rounded">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="object-cover w-full h-full" 
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">Vorschaubild (wird im Verhältnis 4:3 angezeigt)</div>
              </div>
            )}
            
            {fileType === 'application/pdf' && (
              <div className="bg-gray-100 p-3 rounded text-sm">
                PDF-Datei: {fileName}
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="mt-2 text-dark-crimson text-sm">{error}</div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;