'use client';
import { AppLogo } from '@/components/icons';
import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { useState, useEffect } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-brandPrimary">
      {/* Top Navigation Bar */}
      <header className="h-20 border-b border-gray-200 bg-white/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-textPrimary flex items-center justify-center">
              <AppLogo className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-700">Mental Health Therapist</span>
          </div>
          
          {/* Main Navigation */}
          <MainNav />
          
          {/* User Actions */}
          <UserNav />
        </div>
      </header>
      
      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}