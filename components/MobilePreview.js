"use client";

import { useState } from "react";

export default function MobilePreview({ 
  article, 
  isOpen, 
  onClose 
}) {
  // Set default empty values if article isn't provided yet
  const {
    title = "",
    content = "",
    imageUrl = "",
    categories = [],
    locations = [],
    url = "",
  } = article || {};
  
  const [viewMode, setViewMode] = useState("full"); // card or full
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  if (!isOpen) return null;
  
  // Format current time and date for display
  const getCurrentTimestamp = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateString = now.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return `${timeString} | ${dateString}`;
  };
  
  const displayTimestamp = getCurrentTimestamp();
  
  // Fixed device dimensions with 13:6 aspect ratio
  const deviceWidth = 360; // Large size
  const deviceHeight = Math.round(deviceWidth / 6 * 13);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className={`bg-${isDarkMode ? 'gray-800' : 'white'} rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <h2 className="text-xl font-bold">Mobile App Preview</h2>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button 
                onClick={() => setViewMode("card")} 
                className={`px-3 py-1 text-sm ${viewMode === "card" ? "bg-red-600 text-white" : ""}`}
              >
                Card View
              </button>
              <button 
                onClick={() => setViewMode("full")}
                className={`px-3 py-1 text-sm ${viewMode === "full" ? "bg-red-600 text-white" : ""}`}
              >
                Full Article
              </button>
            </div>
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-3 py-1 text-sm border rounded-lg ${isDarkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-800"}`}
            >
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </button>
            
            <button onClick={onClose} className="btn btn-sm btn-circle">✕</button>
          </div>
        </div>
        
        {/* Preview Content */}
        <div className="p-4 flex-1 overflow-auto flex justify-center">
          {/* Mobile Device Frame */}
          <div 
            className={`
              ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border-8 border-gray-800 rounded-3xl overflow-hidden shadow-xl flex flex-col
            `}
            style={{ 
              width: `${deviceWidth}px`,
              height: `${deviceHeight}px`,
            }}
          >
            {/* Status Bar */}
            <div className="bg-gray-800 text-white h-6 flex items-center justify-between px-4 text-xs">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>
            
            {/* App Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* App Header - Matching CommonHeader.js */}
              <div className="h-12 w-full flex items-center justify-center px-4 bg-black">
                {/* Logo centered */}
                <div className="h-10 w-32 flex items-center justify-center bg-gray-800 rounded relative overflow-hidden">
                  {/* Using a placeholder for the splash.png logo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 30" className="w-full h-full px-2">
                      <rect x="5" y="5" width="90" height="20" fill="none" stroke="#fff" strokeWidth="1" />
                      <text x="50" y="19" fontSize="10" textAnchor="middle" fill="#fff" fontFamily="Arial">TheNewJeweller</text>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Article Content Scrollable Area */}
              <div className={`flex-1 overflow-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
                {viewMode === "card" ? (
                  /* Card View */
                  <div className="p-4">
                    <div className={`mb-6 ${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-4 shadow-sm`}>
                      {/* Cover Image */}
                      {imageUrl ? (
                        <div className="w-full h-48 rounded-lg mb-2.5 overflow-hidden">
                          <img 
                            src={imageUrl} 
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-full h-48 rounded-lg mb-2.5 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"} flex items-center justify-center`}>
                          <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>No Image</span>
                        </div>
                      )}

                      {/* Timestamp and Actions */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} break-words`}>{displayTimestamp}</span>
                        <div className="flex">
                          <button className="p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                              <circle cx="18" cy="5" r="3"></circle>
                              <circle cx="6" cy="12" r="3"></circle>
                              <circle cx="18" cy="19" r="3"></circle>
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                          </button>
                          <button className="p-1 ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Red Separator Line */}
                      <div className="h-0.5 bg-red-600 my-1.5"></div>

                      {/* Title */}
                      <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-black"} mt-1 mb-2 break-words`}>{title}</h3>

                      {/* Full Content (not truncated) */}
                      <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"} mb-3 leading-5 break-words whitespace-normal`}>
                        {content}
                      </p>

                      {/* Categories */}
                      {categories && categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {categories.map((cat, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Read More Button */}
                      <div className="flex justify-center">
                        <button className="bg-red-600 text-white font-semibold py-2 px-5 rounded-lg text-sm">
                          Read More
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Full Article View */
                  <div className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-white"} p-4`}>
                    {/* Header with back button */}
                    <div className="flex justify-between items-center mb-4">
                      <button className="p-2">
                        <span className={`text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          ← Back
                        </span>
                      </button>
                      
                      <div className="flex">
                        <button className="p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                        </button>
                        <button className="p-1 ml-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-black"} mb-2 break-words`}>{title}</h2>
                    
                    {/* Timestamp */}
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} mb-4`}>{displayTimestamp}</p>
                    
                    {/* Categories */}
                    {categories && categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {categories.map((cat, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Locations */}
                    {locations && locations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {locations.map((loc, index) => (
                          <span key={index} className="flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {loc}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Featured image */}
                    {imageUrl && (
                      <div className="w-full h-48 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Full content */}
                    <div className="mb-6">
                      <p className={`text-sm leading-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"} mb-4 break-words whitespace-normal`}>
                        {content}
                      </p>
                    </div>
                    
                    {/* Visit website button */}
                    {url && (
                      <button className="bg-red-600 p-3 rounded-lg flex justify-center items-center mb-6 w-full">
                        <span className="text-white font-semibold text-sm">
                          Visit our website for more details!
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Bottom Navigation */}
              <div className="bg-black text-gray-400 flex justify-around py-2 px-2">
                <button className="flex flex-col items-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs mt-1">Latest</span>
                </button>
                
                <button className="flex flex-col items-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 7H7V16H10V7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 7H14V12H17V7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs mt-1">Categories</span>
                </button>
                
                <button className="flex flex-col items-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs mt-1">Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <div className="text-sm opacity-70 mr-auto">
            Note: This is an approximation. The actual app display may vary.
          </div>
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
    </div>
  );
}