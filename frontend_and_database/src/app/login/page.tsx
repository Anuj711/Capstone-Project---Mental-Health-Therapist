'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/login/login-form';
import { AppLogo } from '@/components/icons';

const themeColors = {
  brandPrimary: '#E4EAFF',
  textPrimary: '#6C65C4',
  textSecondary: '#423A93',
};

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!isMounted) return null;

  return (
      <div
        className="relative w-full min-h-screen flex items-center justify-center p-4 overflow-hidden"
        style={{ backgroundColor: themeColors.brandPrimary }}
      >
        {/* Animated gradient orbs */}
        <div
          className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-400/30 blur-3xl transition-all duration-1000 ease-out"
          style={{ left: `${mousePosition.x * 0.02}px`, top: `${mousePosition.y * 0.02}px` }}
        />
        <div className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl right-0 bottom-0" />

        {/* Centered container */}
        <div className="relative z-10 w-full max-w-sm">
        <div
          className="relative space-y-6 rounded-3xl px-8 py-8
            backdrop-blur-3xl border border-white/30 shadow-2xl"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px 0 rgba(108, 101, 196, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* header */}
          <div className="space-y-5 text-center py-2">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-textSecondary">
                Mental Health Therapist
              </h2>
              <p className="text-sm font-light text-gray-700">
                Your space for reflection and growth.
              </p>
            </div>
          </div>

          {/* Login form */}
          <LoginForm />

        </div>
      </div>
    </div>
  );
}
