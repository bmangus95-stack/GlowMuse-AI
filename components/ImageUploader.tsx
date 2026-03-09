
import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string, mimeType: string) => void;
  selectedImage: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, selectedImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // Remove data URL prefix to get raw base64 for API
        const base64Parts = result.split(',');
        if (base64Parts.length > 1) {
          onImageSelect(base64Parts[1], file.type);
        } else {
          console.error("Failed to parse base64 data from file reader result.");
        }
      } else {
        console.error("File reader result is not a string or is null.");
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error: ", error);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor="image-upload"
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 overflow-hidden ${
          isDragging
            ? 'border-brand-500 bg-brand-900/10'
            : 'border-dark-700 bg-dark-800 hover:bg-dark-700'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {selectedImage ? (
          <img
            src={`data:image/jpeg;base64,${selectedImage}`} 
            alt="Reference"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : null}
        
        <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
          <svg
            className={`w-8 h-8 mb-4 ${selectedImage ? 'text-white drop-shadow-md' : 'text-gray-400'}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 16"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
            />
          </svg>
          <p className={`mb-2 text-sm ${selectedImage ? 'text-white font-bold drop-shadow-md' : 'text-gray-400'}`}>
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className={`text-xs ${selectedImage ? 'text-white drop-shadow-md' : 'text-gray-500'}`}>
            PNG, JPG or WEBP
          </p>
        </div>
        <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={onInputChange} />
      </label>
    </div>
  );
};

export default ImageUploader;
