'use client';

import { useUser, useFirestore, useMemoFirebase, useDoc, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { User, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: {
    label: string;
    passed: boolean;
  }[];
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'One number', passed: /[0-9]/.test(password) },
    { label: 'One special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter(c => c.passed).length;

  const levels = [
    { label: 'Very weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-blue-500' },
    { label: 'Very strong', color: 'bg-green-500' },
  ];

  return { score, ...levels[score], checks };
}

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('name');

  const [profileStatus, setProfileStatus] = useState<SaveStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<SaveStatus>('idle');
  const [passwordStatus, setPasswordStatus] = useState<SaveStatus>('idle');
  const [profileError, setProfileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  useDoc(userDocRef);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) return null;

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;
  const isPasswordStrong = passwordStrength ? passwordStrength.score === 4 : false;

  const handleSaveProfile = async () => {
    setProfileStatus('saving');
    setProfileError('');
    try {
      await updateProfile(user, { displayName });
      if (firestore) await setDoc(doc(firestore, 'users', user.uid), { displayName }, { merge: true });
      setProfileStatus('success');
      setTimeout(() => setProfileStatus('idle'), 3000);
    } catch (e: any) {
      setProfileError(e.message || 'Failed to update name.');
      setProfileStatus('error');
    }
  };

  const handleSaveEmail = async () => {
    if (!currentPassword) {
      setEmailError('Enter your current password to change email.');
      setEmailStatus('error');
      return;
    }
    setEmailStatus('saving');
    setEmailError('');
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, email);
      if (firestore) await setDoc(doc(firestore, 'users', user.uid), { email }, { merge: true });
      setCurrentPassword('');
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (e: any) {
      setEmailError(e.code === 'auth/wrong-password' ? 'Incorrect current password.' : e.message || 'Failed to update email.');
      setEmailStatus('error');
    }
  };

  const handleSavePassword = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      setPasswordStatus('error');
      return;
    }
    if (!isPasswordStrong) {
      setPasswordError('Password does not meet all requirements.');
      setPasswordStatus('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setPasswordStatus('error');
      return;
    }

    setPasswordStatus('saving');
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordStatus('success');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (e: any) {
      setPasswordError(e.code === 'auth/wrong-password' ? 'Incorrect current password.' : e.message || 'Failed to update password.');
      setPasswordStatus('error');
    }
  };

  const initials = user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  return (
    <div className="px-6 py-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-base font-bold text-gray-800">Account Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your profile, email, and password</p>
        </div>

        {/* Avatar row */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
          <div className="h-9 w-9 rounded-full bg-textPrimary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Accordion */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">

          {/* Display Name */}
          <AccordionSection
            icon={<User className="h-3.5 w-3.5 text-indigo-500" />}
            title="Display Name"
            isOpen={expanded === 'name'}
            onToggle={() => toggle('name')}
            status={profileStatus}
            error={profileError}
          >
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <SaveButton status={profileStatus} onClick={handleSaveProfile} disabled={displayName === (user.displayName || '')} />
          </AccordionSection>

          {/* Email */}
          <AccordionSection
            icon={<Mail className="h-3.5 w-3.5 text-indigo-500" />}
            title="Email Address"
            subtitle="Requires current password"
            isOpen={expanded === 'email'}
            onToggle={() => toggle('email')}
            status={emailStatus}
            error={emailError}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <PwInput label="Current password" value={currentPassword} onChange={setCurrentPassword} show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} />
            <SaveButton status={emailStatus} onClick={handleSaveEmail} disabled={email === (user.email || '') || !currentPassword} />
          </AccordionSection>

          {/* Password */}
          <AccordionSection
            icon={<Lock className="h-3.5 w-3.5 text-indigo-500" />}
            title="Change Password"
            subtitle="Requires current password"
            isOpen={expanded === 'password'}
            onToggle={() => toggle('password')}
            status={passwordStatus}
            error={passwordError}
          >
            <p className='mt-2'></p>
            <PwInput label="Current password" value={currentPassword} onChange={setCurrentPassword} show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} />
            <PwInput label="New password" value={newPassword} onChange={setNewPassword} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />

            {/* Strength indicator */}
            {newPassword.length > 0 && passwordStrength && (
              <div className="space-y-2">
                {/* Bar */}
                <div className="flex items-center gap-2 text-[0.6rem]">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                          i < passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={` ${
                    passwordStrength.score <= 1 ? 'text-red-500' :
                    passwordStrength.score === 2 ? 'text-yellow-500' :
                    passwordStrength.score === 3 ? 'text-blue-500' : 'text-green-500'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-2 gap-1">
                  {passwordStrength.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <CheckCircle className={`h-3 w-3 flex-shrink-0 ${check.passed ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-[0.6rem] ${check.passed ? 'text-gray-600' : 'text-gray-400'}`}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PwInput label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-1">
                {newPassword === confirmPassword ? (
                  <><CheckCircle className="h-3 w-3 text-green-500" /><span className="text-xs text-green-600">Passwords match</span></>
                ) : (
                  <><AlertCircle className="h-3 w-3 text-red-400" /><span className="text-xs text-red-500">Passwords do not match</span></>
                )}
              </div>
            )}

            <SaveButton
              status={passwordStatus}
              onClick={handleSavePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || !isPasswordStrong || newPassword !== confirmPassword}
              label="Update Password"
            />
          </AccordionSection>

          {/* Permissions */}
          <AccordionSection
            icon={<Video className="h-3.5 w-3.5 text-indigo-500" />}
            title="Audio & Video Permissions"
            subtitle="Manage browser access"
            isOpen={expanded === 'permissions'}
            onToggle={() => toggle('permissions')}
            status="idle"
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed mt-2">
                This app requires microphone and camera access to facilitate video sessions. If you've blocked permissions, follow the steps for your browser below. You can always change these settings later.
              </p>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Chrome</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Click the <span className="font-medium text-gray-700">ⓘ</span> icon in the address bar</li>
                  <li>Set Camera and Microphone to <span className="font-medium text-gray-700">Allow</span></li>
                  <li>Refresh the page</li>
                </ol>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Firefox</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Click the shield icon in the address bar</li>
                  <li>Select <span className="font-medium text-gray-700">Connection Secure → More Information</span></li>
                  <li>Go to Permissions and allow Camera and Microphone</li>
                  <li>Refresh the page</li>
                </ol>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Safari</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Go to <span className="font-medium text-gray-700">Safari → Settings for This Website</span></li>
                  <li>Set Camera and Microphone to <span className="font-medium text-gray-700">Allow</span></li>
                  <li>Refresh the page</li>
                </ol>
              </div>
            </div>
          </AccordionSection>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AccordionSection({ icon, title, subtitle, isOpen, onToggle, status, error, children }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  isOpen: boolean; onToggle: () => void;
  status: SaveStatus; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="text-xs font-semibold text-gray-800">{title}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2.5">
          {children}
          {status === 'success' && (
            <div className="flex items-center gap-1.5 text-green-600 text-xs">
              <CheckCircle className="h-3 w-3" /> Saved successfully
            </div>
          )}
          {status === 'error' && error && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs">
              <AlertCircle className="h-3 w-3" /> {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PwInput({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 pr-9 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button type="button" onClick={onToggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SaveButton({ status, onClick, disabled, label = 'Save Changes' }: {
  status: SaveStatus; onClick: () => void; disabled?: boolean; label?: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || status === 'saving'}
      className="bg-textPrimary text-white rounded-full px-4 h-7 text-xs"
    >
      {status === 'saving' ? 'Saving…' : label}
    </Button>
  );
}