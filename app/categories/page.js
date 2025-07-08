"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
  arrayRemove
} from "firebase/firestore";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [catName, setCatName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    // Get categories
    const unsub = onSnapshot(collection(db, "categories"), (snapshot) => {
      const catData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setCategories(catData);
    });

    // Get article stats for each category
    const fetchCategoryStats = async () => {
      const articlesSnapshot = await getDocs(collection(db, "articles"));
      const stats = {};
      
      articlesSnapshot.forEach(doc => {
        const data = doc.data();
        // Handle both array categories and legacy single category
        if (data.categories && Array.isArray(data.categories)) {
          data.categories.forEach(cat => {
            stats[cat] = (stats[cat] || 0) + 1;
          });
        } else if (data.category) {
          stats[data.category] = (stats[data.category] || 0) + 1;
        }
      });
      
      setCategoryStats(stats);
    };
    
    fetchCategoryStats();
    
    return () => unsub();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    return () => URL.revokeObjectURL(preview);
  };

  const handleEditFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "categories");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.url) {
        throw new Error(data.error || "Upload failed");
      }

      // Update the editing category with new image URL
      if (editingCategory) {
        await updateDoc(doc(db, "categories", editingCategory.id), {
          imageUrl: data.url,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert("Please enter a category name");
      return;
    }

    // Check if category already exists
    if (categories.some(cat => cat.name.toLowerCase() === catName.trim().toLowerCase())) {
      alert("A category with this name already exists");
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = "";

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("type", "categories");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!data.url) {
          throw new Error(data.error || "Upload failed");
        }
        imageUrl = data.url;
      }

      await addDoc(collection(db, "categories"), {
        name: catName.trim(),
        imageUrl,
        createdAt: serverTimestamp(),
      });

      setCatName("");
      setSelectedFile(null);
      setPreviewUrl("");
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Category created successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error adding category:", err);
      alert("Failed to add category: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setShowEditModal(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Please enter a category name");
      return;
    }

    // Check if another category with this name already exists
    if (
      categories.some(
        cat => cat.name.toLowerCase() === editName.trim().toLowerCase() && 
        cat.id !== editingCategory.id
      )
    ) {
      alert("Another category with this name already exists");
      return;
    }

    setIsLoading(true);
    try {
      const oldCategoryName = editingCategory.name;
      const newCategoryName = editName.trim();
      
      // Update category name
      await updateDoc(doc(db, "categories", editingCategory.id), {
        name: newCategoryName,
        updatedAt: serverTimestamp(),
      });

      // Update articles if category name changed
      if (newCategoryName !== oldCategoryName) {
        const articlesRef = collection(db, "articles");
        const querySnapshot = await getDocs(articlesRef);
        const batch = writeBatch(db);

        querySnapshot.forEach((articleDoc) => {
          const articleData = articleDoc.data();
          const articleRef = doc(db, "articles", articleDoc.id);
          
          // Handle both legacy single category and multi-category array
          if (articleData.categories && Array.isArray(articleData.categories)) {
            if (articleData.categories.includes(oldCategoryName)) {
              // Create a new array with the updated category name
              const updatedCategories = articleData.categories.map(cat => 
                cat === oldCategoryName ? newCategoryName : cat
              );
              
              batch.update(articleRef, {
                categories: updatedCategories,
                // Update the primary category if it's the one that changed
                category: articleData.category === oldCategoryName ? 
                  newCategoryName : articleData.category,
                lastUpdated: serverTimestamp()
              });
            }
          } else if (articleData.category === oldCategoryName) {
            // Legacy single category format
            batch.update(articleRef, {
              category: newCategoryName,
              categories: [newCategoryName], // Add the new categories array
              lastUpdated: serverTimestamp()
            });
          }
        });

        await batch.commit();
      }

      setShowEditModal(false);
      setEditingCategory(null);
      setEditName("");
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Category updated successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error updating category:", err);
      alert("Failed to update category: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`Are you sure you want to delete the category "${catName}"? This category will be removed from all articles.`)) return;
    
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const articlesRef = collection(db, "articles");
      const querySnapshot = await getDocs(articlesRef);

      querySnapshot.forEach((articleDoc) => {
        const articleData = articleDoc.data();
        const articleRef = doc(db, "articles", articleDoc.id);
        
        // Handle both multi-category and legacy category formats
        if (articleData.categories && Array.isArray(articleData.categories)) {
          if (articleData.categories.includes(catName)) {
            // Remove the category from the array
            const updatedCategories = articleData.categories.filter(cat => cat !== catName);
            
            batch.update(articleRef, {
              categories: updatedCategories,
              // Update primary category if it was the deleted one
              category: articleData.category === catName ?
                (updatedCategories.length > 0 ? updatedCategories[0] : "") : 
                articleData.category,
              lastUpdated: serverTimestamp()
            });
          }
        } else if (articleData.category === catName) {
          // Legacy single category format
          batch.update(articleRef, {
            category: "",
            categories: [],
            lastUpdated: serverTimestamp()
          });
        }
      });

      // Delete the category document
      const categoryRef = doc(db, "categories", catId);
      batch.delete(categoryRef);

      await batch.commit();

      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Category deleted successfully</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Failed to delete category: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Form to add new category */}
      <div className="md:w-1/3">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Add New Category</h2>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Category Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bracelets"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Placeholder Image</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="file-input file-input-bordered w-full"
                />
                {previewUrl && (
                  <div className="relative w-full h-40 mt-4 rounded-lg overflow-hidden">
                    <Image
                      src={previewUrl}
                      alt="Category Preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
              </div>

              <div className="card-actions justify-end">
                <button
                  type="submit"
                  className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Adding...
                    </>
                  ) : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* List of existing categories */}
      <div className="md:w-2/3">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Manage Categories</h2>
            
            {categories.length === 0 ? (
              <div className="alert">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No categories found. Create your first category.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Articles</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>
                          {cat.imageUrl ? (
                            <div className="avatar">
                              <div className="w-16 rounded">
                                <img src={cat.imageUrl} alt={cat.name} />
                              </div>
                            </div>
                          ) : (
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded w-16">
                                <span>{cat.name.charAt(0)}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="font-medium">{cat.name}</td>
                        <td>
                          <div className="badge badge-neutral">
                            {categoryStats[cat.name] || 0} article{(categoryStats[cat.name] || 0) !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(cat)}
                              className="btn btn-sm btn-primary"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="btn btn-sm btn-error"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingCategory && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Category</h3>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Category Name</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Update Image</span>
                </label>
                <input
                  type="file"
                  onChange={handleEditFileSelect}
                  accept="image/*"
                  className="file-input file-input-bordered w-full"
                />
                {editingCategory.imageUrl && (
                  <div className="mt-2">
                    <div className="avatar">
                      <div className="w-full h-32 rounded">
                        <img
                          src={editingCategory.imageUrl}
                          alt={editingCategory.name}
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Updating...
                    </>
                  ) : 'Update'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => !isLoading && setShowEditModal(false)}></div>
        </dialog>
      )}
    </div>
  );
}