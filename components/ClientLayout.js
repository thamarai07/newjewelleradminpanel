"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";
import Navbar from "./Navbar";

export default function ClientLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isAuthenticated === null) {
    // Show loading state
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <main>{children}</main>; // Render login page without layout
  }

  // Render layout with Navbar when authenticated
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto p-6 max-w-7xl">
        {children}
      </main>
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <div>
          <p>© {new Date().getFullYear()} Admin Panel - All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}