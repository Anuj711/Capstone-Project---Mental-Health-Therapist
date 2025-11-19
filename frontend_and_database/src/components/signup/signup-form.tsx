'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';

export function SignupForm() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Account Created!',
        description: 'Welcome to your wellness journey.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Could not create an account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 w-full">
      {/* Email input */}
      <div className="relative">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          className="w-full px-5 py-2 rounded-2xl bg-white/40 backdrop-blur-xl border-2 border-white/50
            text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-purple-400
            focus:bg-white/60 transition-all shadow-lg"
        />
        {focusedField === 'email' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r
            from-purple-400/30 to-pink-400/30 -z-10 blur-xl" />
        )}
      </div>

      {/* Password input */}
      <div className="relative">
        <input
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          className="w-full px-5 py-2 rounded-2xl bg-white/40 backdrop-blur-xl border-2 border-white/50
            text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-purple-400
            focus:bg-white/60 transition-all shadow-lg"
        />
        {focusedField === 'password' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r
            from-purple-400/30 to-pink-400/30 -z-10 blur-xl" />
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="group w-full py-2 rounded-2xl bg-textSecondary text-white font-semibold
          flex items-center justify-center gap-2 hover:shadow-2xl hover:scale-[1.02]
          transition-all duration-300 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating your account...
          </>
        ) : (
          <>Get started</>
        )}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-400/30"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 text-gray-600 bg-white/30 backdrop-blur-sm rounded-full">or</span>
        </div>
      </div>

      {/* Sign in link */}
      <p className="text-center text-sm text-gray-700">
        Already have an account?{' '}
        <a href="/login" className="text-textSecondary font-semibold inline-flex items-center hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
