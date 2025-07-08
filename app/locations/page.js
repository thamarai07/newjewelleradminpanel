"use client";

import { useState, useEffect } from "react";
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
} from "firebase/firestore";

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [locationName, setLocationName] = useState("");
  const [editingLocation, setEditingLocation] = useState(null);
  const [deleteLocation, setDeleteLocation] = useState(null);
  const [editName, setEditName] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationStats, setLocationStats] = useState({});

  useEffect(() => {
    // Get locations
    const unsub = onSnapshot(collection(db, "locations"), (snapshot) => {
      const locData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setLocations(locData);
    });

    // Get article stats for each location
    const fetchLocationStats = async () => {
      const articlesSnapshot = await getDocs(collection(db, "articles"));
      const stats = {};
      
      articlesSnapshot.forEach(doc => {
        const data = doc.data();
        // Handle both array locations and single location
        if (data.locations && Array.isArray(data.locations)) {
          data.locations.forEach(loc => {
            stats[loc] = (stats[loc] || 0) + 1;
          });
        } else if (data.location) {
          stats[data.location] = (stats[data.location] || 0) + 1;
        }
      });
      
      setLocationStats(stats);
    };
    
    fetchLocationStats();
    
    return () => unsub();
  }, []);

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!locationName.trim()) {
      alert("Please enter a location name");
      return;
    }

    // Check if location already exists
    if (locations.some(loc => loc.name.toLowerCase() === locationName.trim().toLowerCase())) {
      alert("A location with this name already exists");
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, "locations"), {
        name: locationName.trim(),
        createdAt: serverTimestamp(),
      });

      setLocationName("");
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Location created successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error adding location:", err);
      alert("Failed to add location: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (location) => {
    setEditingLocation(location);
    setEditName(location.name);
    setShowEditModal(true);
  };

  const handleDeleteClick = (location) => {
    setDeleteLocation(location);
    setShowDeleteModal(true);
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Please enter a location name");
      return;
    }

    // Check if another location with this name already exists
    if (
      locations.some(
        loc => loc.name.toLowerCase() === editName.trim().toLowerCase() && 
        loc.id !== editingLocation.id
      )
    ) {
      alert("Another location with this name already exists");
      return;
    }

    setIsLoading(true);
    try {
      const oldLocationName = editingLocation.name;
      const newLocationName = editName.trim();
      
      // Update location name
      await updateDoc(doc(db, "locations", editingLocation.id), {
        name: newLocationName,
        updatedAt: serverTimestamp(),
      });

      // Update articles if location name changed
      if (newLocationName !== oldLocationName) {
        const articlesRef = collection(db, "articles");
        const querySnapshot = await getDocs(articlesRef);
        const batch = writeBatch(db);

        querySnapshot.forEach((articleDoc) => {
          const articleData = articleDoc.data();
          const articleRef = doc(db, "articles", articleDoc.id);
          
          // Handle both multi-location and single location formats
          if (articleData.locations && Array.isArray(articleData.locations)) {
            if (articleData.locations.includes(oldLocationName)) {
              // Create a new array with the updated location name
              const updatedLocations = articleData.locations.map(loc => 
                loc === oldLocationName ? newLocationName : loc
              );
              
              batch.update(articleRef, {
                locations: updatedLocations,
                // Update the primary location if it's the one that changed
                location: articleData.location === oldLocationName ? 
                  newLocationName : articleData.location,
                lastUpdated: serverTimestamp()
              });
            }
          } else if (articleData.location === oldLocationName) {
            // Legacy single location format
            batch.update(articleRef, {
              location: newLocationName,
              locations: [newLocationName], // Add the new locations array
              lastUpdated: serverTimestamp()
            });
          }
        });

        await batch.commit();
      }

      setShowEditModal(false);
      setEditingLocation(null);
      setEditName("");
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Location updated successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error updating location:", err);
      alert("Failed to update location: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!deleteLocation) return;
    
    setIsLoading(true);
    try {
      const locId = deleteLocation.id;
      const locName = deleteLocation.name;
      const batch = writeBatch(db);
      const articlesRef = collection(db, "articles");
      const querySnapshot = await getDocs(articlesRef);

      querySnapshot.forEach((articleDoc) => {
        const articleData = articleDoc.data();
        const articleRef = doc(db, "articles", articleDoc.id);
        
        // Handle both multi-location and legacy location formats
        if (articleData.locations && Array.isArray(articleData.locations)) {
          if (articleData.locations.includes(locName)) {
            // Remove the location from the array
            const updatedLocations = articleData.locations.filter(loc => loc !== locName);
            
            batch.update(articleRef, {
              locations: updatedLocations,
              // Update primary location if it was the deleted one
              location: articleData.location === locName ?
                (updatedLocations.length > 0 ? updatedLocations[0] : "") : 
                articleData.location,
              lastUpdated: serverTimestamp()
            });
          }
        } else if (articleData.location === locName) {
          // Legacy single location format
          batch.update(articleRef, {
            location: "",
            locations: [],
            lastUpdated: serverTimestamp()
          });
        }
      });

      // Delete the location document
      const locationRef = doc(db, "locations", locId);
      batch.delete(locationRef);

      await batch.commit();

      setShowDeleteModal(false);
      setDeleteLocation(null);

      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Location deleted successfully</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error deleting location:", err);
      alert("Failed to delete location: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Form to add new location */}
      <div className="md:w-1/3">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Add New Location</h2>
            
            <form onSubmit={handleAddLocation} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Location Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. New York"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="card-actions justify-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Adding...
                    </>
                  ) : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* List of existing locations */}
      <div className="md:w-2/3">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Manage Locations</h2>
            
            {locations.length === 0 ? (
              <div className="alert">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No locations found. Create your first location.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Articles</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id}>
                        <td className="font-medium">{loc.name}</td>
                        <td>
                          <div className="badge badge-neutral">
                            {locationStats[loc.name] || 0} article{(locationStats[loc.name] || 0) !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(loc)}
                              className="btn btn-sm btn-primary"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(loc)}
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
      {showEditModal && editingLocation && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Location</h3>
            <form onSubmit={handleUpdateLocation} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Location Name</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
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
                  className="btn btn-primary"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteLocation && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">Confirm Deletion</h3>
            <p className="py-4">
              Are you sure you want to delete the location "{deleteLocation.name}"? 
              This location will be removed from all articles.
              {locationStats[deleteLocation.name] > 0 && (
                <span className="block mt-2 font-semibold">
                  This will affect {locationStats[deleteLocation.name]} article{locationStats[deleteLocation.name] > 1 ? 's' : ''}.
                </span>
              )}
            </p>
            <div className="modal-action">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLocation}
                className="btn btn-error"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Deleting...
                  </>
                ) : 'Delete Location'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isLoading && setShowDeleteModal(false)}></div>
        </dialog>
      )}
    </div>
  );
}