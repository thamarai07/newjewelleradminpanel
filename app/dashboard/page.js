"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";

export default function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  const MAX_CONTENT_LENGTH = 256;
  const PREVIEW_LENGTH = 100;

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const articlesSnapshot = await getDocs(collection(db, "articles"));
      const fetchedArticles = articlesSnapshot.docs.map((doc) => {
        const data = doc.data();
        // Ensure content doesn't exceed our max length
        let content = data.content || "";
        if (content.length > MAX_CONTENT_LENGTH) {
          content = content.substring(0, MAX_CONTENT_LENGTH);
        }
        
        return {
          id: doc.id,
          ...data,
          content: content,
          createdAt: data.createdAt?.toDate(),
        };
      });
      
      setArticles(fetchedArticles);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (article) => {
    setArticleToDelete(article);
    setShowDeleteModal(true);
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch("/api/delete-article", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleId: articleToDelete.id }),
      });
  
      if (response.ok) {
        // Close modal and reset state
        setShowDeleteModal(false);
        setArticleToDelete(null);
        
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'toast toast-top toast-center';
        toast.innerHTML = `
          <div class="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Article deleted successfully!</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
        
        // Refresh article list
        fetchArticles();
      } else {
        throw new Error("Failed to delete article");
      }
    } catch (error) {
      console.error("Error deleting article:", error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-center';
      toast.innerHTML = `
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Failed to delete article</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/new-article" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Article
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : articles.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No Articles Found</h2>
            <p>Start creating your first article by clicking the button below.</p>
            <div className="card-actions justify-center mt-4">
              <Link href="/new-article" className="btn btn-primary">Create Article</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <div key={article.id} className="card card-zoom bg-base-100 shadow-xl">
              {article.imageUrl && (
                <figure>
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                  />
                </figure>
              )}
              <div className="card-body">
                <h2 className="card-title">
                  {article.title}
                </h2>
                
                {/* Display metadata */}
                <div className="flex flex-col gap-2 mt-1">
                  {/* Categories Display */}
                  <div className="flex flex-wrap gap-1">
                    {article.categories && Array.isArray(article.categories) ? (
                      article.categories.map((cat) => (
                        <div key={cat} className="badge badge-primary">{cat}</div>
                      ))
                    ) : article.category ? (
                      <div className="badge badge-primary">{article.category}</div>
                    ) : null}
                  </div>
                  
                  {/* Locations Display */}
                  {(article.locations && article.locations.length > 0) || article.location ? (
                    <div className="flex flex-wrap gap-1">
                      {article.locations && Array.isArray(article.locations) ? (
                        article.locations.map((loc) => (
                          <div key={loc} className="badge badge-secondary">{loc}</div>
                        ))
                      ) : article.location ? (
                        <div className="badge badge-secondary">{article.location}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                
                {/* Display Content Safely with Character Count Indicator */}
                <div className="mt-2">
                  <div
                    className="text-base-content opacity-75 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: article.content.length > PREVIEW_LENGTH
                        ? `${article.content.substring(0, PREVIEW_LENGTH)}...`
                        : article.content,
                    }}
                  ></div>
                  <div className="text-xs text-right text-base-content/50 mt-1">
                    {article.content.length}/{MAX_CONTENT_LENGTH} characters
                  </div>
                </div>

                {/* Display Creation Date */}
                <p className="text-sm opacity-70 mt-2">
                  Created on: {article.createdAt ? format(article.createdAt, "PPpp") : "Unknown"}
                </p>

                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={() => router.push(`/edit-article/${article.id}`)}
                    className="btn btn-primary btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(article)}
                    className="btn btn-error btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && articleToDelete && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">Confirm Deletion</h3>
            <p className="py-4">
              Are you sure you want to delete the article "{articleToDelete.title}"?
              <span className="block mt-2 text-error">This action cannot be undone.</span>
            </p>
            <div className="modal-action">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteArticle}
                className="btn btn-error"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Deleting...
                  </>
                ) : 'Delete Article'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isDeleting && setShowDeleteModal(false)}></div>
        </dialog>
      )}
    </div>
  );
}