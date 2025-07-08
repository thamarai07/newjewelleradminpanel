"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className={`z-20 hidden w-64 overflow-y-auto bg-white dark:bg-gray-800 md:block flex-shrink-0`}>
      <div className="py-4 text-gray-500 dark:text-gray-400">
        {/* Logo Section */}
        <div className="ml-6">
          <img src="/splash.png" alt="App Logo" className="w-32 h-auto" />
        </div>

        <ul className="mt-6">
          <li>
            <a
              href="/dashboard"
              className="flex items-center px-6 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Dashboard
            </a>
          </li>
          <li>
            <a
              href="/new-article"
              className="flex items-center px-6 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              New Article
            </a>
          </li>
          <li>
            <a
              href="/categories"
              className="flex items-center px-6 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Manage Categories
            </a>
          </li>

        </ul>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
