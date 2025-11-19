'use client';
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { SignupForm } from '@/components/signup/signup-form';

const themeColors = {
  brandPrimary: '#E4EAFF',
  textPrimary: '#6C65C4',
  textSecondary: '#423A93',
};

export default function SignupPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/30 
        to-pink-400/30 blur-3xl transition-all duration-1000 ease-out"
        style={{
          left: `${mousePosition.x * 0.02}px`,
          top: `${mousePosition.y * 0.02}px`,
        }}
      />
      <div className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 
      to-purple-400/20 blur-3xl right-0 bottom-0" />
      
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left: Content */}
        <div className="space-y-6 text-center lg:text-left lg:px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40
           backdrop-blur-sm border border-white/20">
            <Sparkles className="w-3.5 h-3.5" style={{ color: themeColors.textPrimary }} />
            <span className="text-xs font-medium" style={{ color: themeColors.textSecondary }}>
              Mental Wellness Platform
            </span>
          </div>
          
          <div className="space-y-3">
            <h1 
              className="text-4xl font-bold leading-tight tracking-tight"
              style={{ color: themeColors.textSecondary }}
            >
              Your Journey Towards Clarity Starts Here
            </h1>
            <p 
              className="text-base leading-relaxed max-w-sm mx-auto lg:mx-0 font-light"
              style={{ color: 'rgba(0, 0, 0, 0.6)' }}
            >
              Evidence-based support, compassionate guidance, and tools to help you thrive - available whenever you need it.
            </p>
          </div>

          {/*stats/benefits */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0  pt-8">
            {[
              { value: '24/7', label: 'Available' },
              { value: '100%', label: 'Confidential' },
              { value: 'Free', label: 'To Use' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center lg:text-left">
                <div className="text-xl font-bold text-textSecondary" >
                  {stat.value}
                </div>
                <div className="text-xs font-medium mt-0.5" style={{ color: 'rgba(0, 0, 0, 0.5)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Glass Form */}
        <div className="relative max-w-sm w-full">
          {/* Multiple glow layers */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 rounded-3xl blur-3xl animate-pulse" />
          <div className="absolute -inset-1 bg-gradient-to-br from-white/40 to-white/10 rounded-3xl blur-xl" />
         
          
          <div 
            className="relative rounded-3xl px-6 py-2 backdrop-blur-3xl border border-white/30 shadow-2xl"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px 0 rgba(108, 101, 196, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)'
            }}
          >
            <div className="space-y-5 max-w-sm mx-auto">
              {/* Header */}
              <div className="space-y-2 py-4 text-center">
                <h2 className="text-3xl font-bold text-textSecondary">
                  Create an account
                </h2>
                <p className="text-sm text-gray-700">
                  Join thousands finding their path to wellness
                </p>
              </div>

              <SignupForm />

              <div className="pt-4 border-t border-gray-400/20">
                <p className="text-xs text-center text-gray-600 leading-relaxed">
                  By creating an account, you agree to our Terms of Service and Privacy Policy. 
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}