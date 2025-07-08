"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        router.push('/dashboard');  // Redirect to the dashboard if logged in
      } else {
        router.push('/login');  // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <p className="text-center mt-10">Redirecting...</p>;
}
