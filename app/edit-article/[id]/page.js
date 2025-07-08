"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import Link from "next/link";
import MobilePreview from "../../../components/MobilePreview";
import ImageCropper from "../../../components/ImageCropper";

export default function EditArticle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentCharCount, setContentCharCount] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [croppedImage, setCroppedImage] = useState(null);
  const [url, setUrl] = useState(""); // For article URL
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  
  const MAX_CONTENT_LENGTH = 256;

  useEffect(() => {
    // 1) Fetch article data
    const fetchArticle = async () => {
      setIsFetching(true);
      try {
        const docRef = doc(db, "articles", id);
        const articleSnap = await getDoc(docRef);
        if (articleSnap.exists()) {
          const data = articleSnap.data();
          setTitle(data.title || "");
          
          // Set content with character limit enforcement
          const articleContent = data.content || "";
          setContent(articleContent.substring(0, MAX_CONTENT_LENGTH));
          setContentCharCount(articleContent.length > MAX_CONTENT_LENGTH ? 
            MAX_CONTENT_LENGTH : articleContent.length);
            
          setImageUrl(data.imageUrl || "");
          setUrl(data.url || "");
          
          // Handle both new multi-category format and legacy single category format
          if (data.categories && Array.isArray(data.categories)) {
            setSelectedCategories(data.categories);
          } else if (data.category) {
            setSelectedCategories([data.category]);
          } else {
            setSelectedCategories([]);
          }
          
          // Handle both new multi-location format and legacy single location format
          if (data.locations && Array.isArray(data.locations)) {
            setSelectedLocations(data.locations);
          } else if (data.location) {
            setSelectedLocations([data.location]);
          } else {
            setSelectedLocations([]);
          }
        } else {
          setError("Article not found");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article data");
      } finally {
        setIsFetching(false);
      }
    };
    fetchArticle();

    // 2) Listen to categories from Firestore
    const unsubCat = onSnapshot(collection(db, "categories"), (snapshot) => {
      const cats = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCategories(cats);
    });
    
    // 3) Listen to locations from Firestore
    const unsubLoc = onSnapshot(collection(db, "locations"), (snapshot) => {
      const locs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setLocations(locs);
    });

    return () => {
      unsubCat();
      unsubLoc();
    };
  }, [id]);

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
    url
  };

  /**
   * Send push notification for the updated article
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    
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
    
    try {
      const docRef = doc(db, "articles", id);
      await updateDoc(docRef, {
        title,
        content,
        imageUrl: finalImageUrl,
        url,
        // Store categories as both array and primary category for backward compatibility
        categories: selectedCategories,
        category: selectedCategories[0] || "",
        // Store locations as both array and primary location for backward compatibility
        locations: selectedLocations,
        location: selectedLocations[0] || "",
        updatedAt: serverTimestamp(),
      });
      
      // Send push notification if enabled
      if (sendNotification) {
        await sendPushNotification(id);
      }
      
      // Revoke any blob URLs we may have created
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Article updated successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
        router.push("/dashboard");
      }, 1500);
      
    } catch (error) {
      console.error("Error updating article:", error);
      alert("Failed to update article: " + error.message);
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
        <div className="mt-4">
          <Link href="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Edit Article</h1>
          <p className="text-base-content/70 mt-2">
            Update the article details below.
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">
          Back to Dashboard
        </Link>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Title */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Title</span>
              </label>
              <input
                type="text"
                placeholder="Article title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* URL Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Article URL (Optional)</span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input input-bordered w-full"
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
                <span className="label-text-alt">Current or new image</span>
              </label>

              {showImageCropper ? (
                <div className="mt-2">
                  <ImageCropper 
                    onImageCropped={handleImageCropped} 
                    initialImage={imageUrl.startsWith('blob:') ? null : imageUrl}
                  />
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
                      <div className="w-full h-64 rounded-lg overflow-hidden">
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

            {/* Content with Character Counter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Content</span>
                <span className="label-text-alt">{contentCharCount}/{MAX_CONTENT_LENGTH} characters</span>
              </label>
              <textarea
                placeholder="Article content (max 256 characters)"
                value={content}
                onChange={handleContentChange}
                className="textarea textarea-bordered w-full"
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
                  Send push notification about this update
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
              <Link href="/dashboard" className="btn btn-ghost">
                Cancel
              </Link>
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
                disabled={isLoading}
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Updating...
                  </>
                ) : 'Update Article'}
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