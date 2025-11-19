'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login successful!", description: "Redirecting to dashboard..." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Could not log in. Please check your credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'Could not log in with Google. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      {/* Email */}
      <div className="relative">
        <input
          type="email"
          placeholder="Enter your email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-5 py-2 rounded-2xl bg-white/40 backdrop-blur-xl
            border-2 border-white/50 text-gray-900 placeholder:text-gray-500
            focus:outline-none focus:border-purple-400 focus:bg-white/60
            transition-all shadow-lg text-base"
        />
      </div>

      {/* Password */}
      <div className="relative">
        <input
          type="password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-5 py-2 rounded-2xl bg-white/40 backdrop-blur-xl
            border-2 border-white/50 text-gray-900 placeholder:text-gray-500
            focus:outline-none focus:border-purple-400 focus:bg-white/60
            transition-all shadow-lg text-base"
        />
      </div>

      {/* Login button */}
      <button
        type="submit"
        disabled={isLoading || isGoogleLoading}
        className="w-full py-2 rounded-2xl bg-textSecondary text-white font-semibold
          flex items-center justify-center gap-2 hover:shadow-2xl hover:scale-[1.02]
          transition-all duration-300 disabled:opacity-50"
      >
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        Login
      </button>

      {/* Google login button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading || isGoogleLoading}
        className="w-full py-2 rounded-2xl bg-white/40 text-gray-900 font-semibold
          flex items-center justify-center gap-2 hover:shadow-xl hover:scale-[1.02]
          transition-all duration-300 disabled:opacity-50"
      >
        {isGoogleLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        Login with Google
      </button>

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-700">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-textSecondary font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
