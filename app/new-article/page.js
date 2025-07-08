"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import MobilePreview from "../../components/MobilePreview";
import ImageCropper from "../../components/ImageCropper";

export default function NewArticle() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentCharCount, setContentCharCount] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [croppedImage, setCroppedImage] = useState(null);
  const [articleUrl, setArticleUrl] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendNotification, setSendNotification] = useState(true); // Default to true
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  
  const MAX_CONTENT_LENGTH = 256;

  useEffect(() => {
    // Load categories
    const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
      const cats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(cats);
    });

    // Load locations
    const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => {
      const locs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLocations(locs);
    });
    
    return () => {
      unsubCategories();
      unsubLocations();
    };
  }, []);

  // Handle the cropped image blob from ImageCropper
  const handleImageCropped = (blob) => {
    if (!blob) return;
    
    // Create a preview URL for display
    const previewUrl = URL.createObjectURL(blob);
    setImageUrl(previewUrl);
    setCroppedImage(blob);
    setShowImageCropper(false);
  };

  // Handle toggling category selection
  const handleCategoryToggle = (categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(cat => cat !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  // Handle toggling location selection
  const handleLocationToggle = (locationName) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationName)) {
        return prev.filter(loc => loc !== locationName);
      } else {
        return [...prev, locationName];
      }
    });
  };

  // Handle content change with character limit
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent);
      setContentCharCount(newContent.length);
    }
  };

  // Toggle preview modal
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  // The article object to preview - construct from current form values
  const previewArticle = {
    title,
    content,
    imageUrl,
    categories: selectedCategories,
    locations: selectedLocations,
    url: articleUrl
  };

  /**
   * Send push notification for a newly created article
   */
  const sendPushNotification = async (articleId) => {
    try {
      setNotificationStatus({ loading: true });
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          title,
          categories: selectedCategories,
          imageUrl
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNotificationStatus({ 
          success: true, 
          message: `Notification sent to ${result.tokensCount || 0} devices` 
        });
        console.log('Push notification sent successfully:', result);
        return true;
      } else {
        setNotificationStatus({ 
          error: true, 
          message: result.error || 'Failed to send notification' 
        });
        console.error('Failed to send push notification:', result.error);
        return false;
      }
    } catch (error) {
      setNotificationStatus({ 
        error: true, 
        message: error.message || 'Error sending notification' 
      });
      console.error('Error sending push notification:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate the article URL if provided
    if (articleUrl && !isValidUrl(articleUrl)) {
      alert("Please enter a valid URL");
      return;
    }

    if (selectedCategories.length === 0) {
      alert("Please select at least one category");
      return;
    }

    setIsLoading(true);
    let finalImageUrl = imageUrl;

    // If a cropped image blob exists, upload it
    if (croppedImage) {
      const formData = new FormData();
      formData.append("file", croppedImage, "cropped-image.jpg");
      formData.append("type", "articles");

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.url) {
          finalImageUrl = data.url;
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image: " + error.message);
        setIsLoading(false);
        return;
      }
    }

    // Create the new article document in Firestore
    try {
      // Add article to Firestore
      const docRef = await addDoc(collection(db, "articles"), {
        title,
        content,
        imageUrl: finalImageUrl,
        url: articleUrl,
        createdAt: serverTimestamp(),
        // Categories - store as both array and primary category for backward compatibility
        categories: selectedCategories,
        category: selectedCategories[0] || "",
        // Locations - similarly store as both array and primary location
        locations: selectedLocations,
        location: selectedLocations[0] || "",
      });
      
      // Send push notification if enabled
      if (sendNotification) {
        await sendPushNotification(docRef.id);
      }
      
      // Success toast or alert
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Article created successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);

      // If using a blob URL for preview, you can revoke it to free memory
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }

      // Reset the form
      setTitle("");
      setContent("");
      setContentCharCount(0);
      setImageUrl("");
      setCroppedImage(null);
      setArticleUrl("");
      setSelectedCategories([]);
      setSelectedLocations([]);
      // Keep notification preference as is for next article
    } catch (error) {
      console.error("Error adding article:", error);
      alert("Failed to add article: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to validate URLs
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Article</h1>
        <p className="text-base-content/70 mt-2">
          Add a new article to your collection. Fill in the details below.
        </p>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Enter article title"
                required
              />
            </div>

            {/* Article URL Input */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Article URL (Optional)</span>
              </label>
              <input
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                className="input input-bordered w-full"
                placeholder="https://example.com/article"
              />
            </div>

            {/* Multi-Category Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Categories</span>
                <span className="label-text-alt">Select one or more</span>
              </label>
              
              {categories.length === 0 ? (
                <div className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>No categories found. Please create categories first.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={selectedCategories.includes(cat.name)}
                          onChange={() => handleCategoryToggle(cat.name)}
                        />
                        <span className="label-text">{cat.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((cat) => (
                  <div key={cat} className="badge badge-primary gap-1">
                    {cat}
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-circle"
                      onClick={() => handleCategoryToggle(cat)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Multi-Location Selection */}
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text text-lg">Locations</span>
                <span className="label-text-alt">Select one or more (optional)</span>
              </label>
              
              {locations.length === 0 ? (
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>No locations found. You can add locations in the Locations section.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-secondary"
                          checked={selectedLocations.includes(loc.name)}
                          onChange={() => handleLocationToggle(loc.name)}
                        />
                        <span className="label-text">{loc.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Locations Display */}
            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map((loc) => (
                  <div key={loc} className="badge badge-secondary gap-1">
                    {loc}
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-circle"
                      onClick={() => handleLocationToggle(loc)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload & Cropping Section */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Cover Image</span>
              </label>

              {showImageCropper ? (
                <div className="mt-2">
                  <ImageCropper onImageCropped={handleImageCropped} />
                  <button 
                    type="button"
                    className="btn btn-ghost mt-4"
                    onClick={() => setShowImageCropper(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowImageCropper(true)}
                    className="btn btn-primary"
                  >
                    Select & Crop Image
                  </button>

                  {imageUrl && (
                    <div className="mt-4">
                      <div className="relative w-full h-64 rounded-lg overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-error"
                          onClick={() => {
                            if (imageUrl.startsWith('blob:')) {
                              URL.revokeObjectURL(imageUrl);
                            }
                            setImageUrl("");
                            setCroppedImage(null);
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Textarea with Character Counter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Content</span>
                <span className="label-text-alt">{contentCharCount}/{MAX_CONTENT_LENGTH} characters</span>
              </label>
              <textarea
                value={content}
                onChange={handleContentChange}
                className="textarea textarea-bordered w-full"
                placeholder="Enter article content (max 256 characters)"
                rows={6}
                maxLength={MAX_CONTENT_LENGTH}
                required
              ></textarea>
              <div className="mt-2 flex justify-end">
                <progress 
                  className={`progress w-56 ${contentCharCount > MAX_CONTENT_LENGTH * 0.8 ? 'progress-warning' : 'progress-primary'}`} 
                  value={contentCharCount} 
                  max={MAX_CONTENT_LENGTH}
                ></progress>
              </div>
            </div>

            {/* Push Notification Option */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-accent" 
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                />
                <span className="label-text">
                  Send push notification to all app users
                </span>
              </label>
              {notificationStatus && (
                <div className="mt-2">
                  {notificationStatus.loading && (
                    <div className="flex items-center text-info">
                      <span className="loading loading-spinner loading-xs mr-2"></span>
                      <span className="text-sm">Sending notification...</span>
                    </div>
                  )}
                  {notificationStatus.success && (
                    <div className="flex items-center text-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">{notificationStatus.message}</span>
                    </div>
                  )}
                  {notificationStatus.error && (
                    <div className="flex items-center text-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm">{notificationStatus.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="card-actions justify-end">
              <button
                type="button"
                onClick={togglePreview}
                className="btn btn-secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Mobile Preview
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Publishing...
                  </>
                ) : 'Publish Article'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Preview Modal */}
      {showPreview && (
        <MobilePreview 
          article={previewArticle}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}