"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper function to determine if a link is active
  const isActive = (path) => {
    return pathname === path ? "active" : "";
  };

  return (
    <div className="navbar bg-base-300 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/dashboard" className={isActive("/dashboard")}>Dashboard</Link></li>
            <li><Link href="/new-article" className={isActive("/new-article")}>New Article</Link></li>
            <li><Link href="/categories" className={isActive("/categories")}>Categories</Link></li>
            <li><Link href="/locations" className={isActive("/locations")}>Locations</Link></li>
          </ul>
        </div>
        <Link href="/dashboard" className="btn btn-ghost text-xl">
          <img src="/splash.png" alt="App Logo" className="h-8 w-auto mr-2" />
          Admin Panel
        </Link>
      </div>
      
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/dashboard" className={isActive("/dashboard")}>Dashboard</Link></li>
          <li><Link href="/new-article" className={isActive("/new-article")}>New Article</Link></li>
          <li><Link href="/categories" className={isActive("/categories")}>Categories</Link></li>
          <li><Link href="/locations" className={isActive("/locations")}>Locations</Link></li>
        </ul>
      </div>
      
      <div className="navbar-end">
        {user && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-10">
                <span>{user.email ? user.email.charAt(0).toUpperCase() : "U"}</span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li><button onClick={handleLogout} className="text-error">Logout</button></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}