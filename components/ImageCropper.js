"use client";

import { useState, useRef, useEffect } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function ImageCropper({ 
  onImageCropped, 
  initialImage = null,
  aspectRatio = 2 // Default to 2:1 aspect ratio
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [paddingColor, setPaddingColor] = useState("white"); // "white" or "black"
  const [isLoading, setIsLoading] = useState(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // If an initial image is provided, load it safely
  useEffect(() => {
    if (initialImage) {
      // For initial images that might be from other origins,
      // we need to load them into a local blob to avoid tainted canvas
      fetch(initialImage)
        .then(response => response.blob())
        .then(blob => {
          const localUrl = URL.createObjectURL(blob);
          setPreviewUrl(localUrl);
        })
        .catch(error => {
          console.error("Error loading initial image:", error);
          // Fallback to direct URL, but this might cause security issues with canvas operations
          setPreviewUrl(initialImage);
        });
    }
  }, [initialImage]);

  // When a file is selected
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      setCrop(undefined);
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Reset crop when a new image is selected
    setCrop(undefined);
  };

  // When an image loads, set up initial crop
  const onImageLoad = (e) => {
    try {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
      
      setOriginalImageDimensions({ width, height });
      
      // Create a centered crop with the specified aspect
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 100
          },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      );
      
      setCrop(initialCrop);
    } catch (error) {
      console.error("Error in onImageLoad:", error);
    }
  };

  // Create a padded version of the image to maintain aspect ratio
  const createPaddedImage = (callback) => {
    if (!imageRef.current || !crop) return;
    
    setIsLoading(true);
    
    // For locally selected files, we need to create a new canvas with the padded image
    // without triggering the security error
    try {
      // Use the selected file directly (which is local and not tainted)
      if (selectedFile) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const img = new Image();
          
          img.onload = () => {
            // Create a canvas with target aspect ratio
            const canvas = document.createElement('canvas');
            const targetAspect = aspectRatio;
            let canvasWidth, canvasHeight;
            
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            
            // Determine dimensions to maintain aspect ratio with padding
            if (width / height > targetAspect) {
              // Image is wider than target aspect ratio
              canvasWidth = width;
              canvasHeight = width / targetAspect;
            } else {
              // Image is taller than target aspect ratio
              canvasHeight = height;
              canvasWidth = height * targetAspect;
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // Get context and fill with padding color
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = paddingColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Calculate position to center the image
            const x = (canvasWidth - width) / 2;
            const y = (canvasHeight - height) / 2;
            
            // Draw the original image in the center
            ctx.drawImage(img, x, y, width, height);
            
            // Convert to blob for upload
            canvas.toBlob(blob => {
              if (blob) {
                const paddedImageUrl = URL.createObjectURL(blob);
                
                // Set the preview URL to the padded image
                setPreviewUrl(paddedImageUrl);
                
                // Reset the crop for the new padded image
                setCrop(undefined);
                
                if (callback) callback(blob);
              } else {
                console.error("Failed to create blob from canvas");
              }
              setIsLoading(false);
            }, 'image/jpeg');
          };
          
          // Load the image from the FileReader result
          img.src = event.target.result;
        };
        
        // Read the selected file as a data URL
        reader.readAsDataURL(selectedFile);
      } else {
        // Handle case where we're working with an initialImage URL
        // This is more complex and might require server-side processing if cross-origin
        setIsLoading(false);
        alert("Please select a file first.");
      }
    } catch (error) {
      console.error("Error in createPaddedImage:", error);
      setIsLoading(false);
      alert("An error occurred while processing the image. Please try again.");
    }
  };

  // Apply the final crop to the image
  const cropImage = () => {
    if (!imageRef.current || !completedCrop) return;
    
    setIsLoading(true);
    
    try {
      const image = imageRef.current;
      const canvas = canvasRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to final crop size
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      
      // For security reasons, we need to handle this differently
      // We first load the current previewUrl (which should be safe to use)
      const img = new Image();
      
      img.onload = () => {
        // Draw the cropped image
        ctx.drawImage(
          img,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY
        );
        
        // Convert to blob for upload
        canvas.toBlob(blob => {
          if (blob && onImageCropped) {
            onImageCropped(blob);
          } else {
            console.error("Failed to create blob from cropped canvas");
          }
          setIsLoading(false);
        }, 'image/jpeg');
      };
      
      // Set the source to the current preview URL
      // This should be a blob URL from our previous operations
      // and should be safe to use with canvas operations
      img.src = previewUrl;
    } catch (error) {
      console.error("Error in cropImage:", error);
      setIsLoading(false);
      alert("An error occurred while cropping the image. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-lg">Select Image</span>
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          accept="image/*"
          className="file-input file-input-bordered w-full"
        />
      </div>
      
      {/* Padding Color Selection */}
      {previewUrl && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Padding Color</span>
          </label>
          <div className="flex gap-2">
            <label className="flex items-center cursor-pointer gap-2">
              <input
                type="radio"
                name="padding-color"
                className="radio radio-primary"
                checked={paddingColor === "white"}
                onChange={() => setPaddingColor("white")}
              />
              <span>White</span>
            </label>
            <label className="flex items-center cursor-pointer gap-2">
              <input
                type="radio"
                name="padding-color"
                className="radio radio-primary"
                checked={paddingColor === "black"}
                onChange={() => setPaddingColor("black")}
              />
              <span>Black</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Image Preview with Crop */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="overflow-auto max-h-96 border rounded-lg p-2">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
            >
              <img 
                ref={imageRef}
                src={previewUrl} 
                alt="Preview" 
                onLoad={onImageLoad}
                className="max-w-full"
              />
            </ReactCrop>
          </div>
          
          {/* Hidden canvas for processing */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => createPaddedImage()}
              disabled={isLoading || !imageRef.current}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm mr-2"></span>
              ) : null}
              Pad to 2:1 Ratio
            </button>
            
            <button
              type="button"
              className="btn btn-primary"
              onClick={cropImage}
              disabled={isLoading || !completedCrop}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm mr-2"></span>
              ) : null}
              Apply Crop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}