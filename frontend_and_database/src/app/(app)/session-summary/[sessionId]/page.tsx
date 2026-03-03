'use client';

import { use, useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionSummary } from '@/components/session-summary/SessionSummary';
import { resumeSession } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

export default function SummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [summaryData, setSummaryData] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      console.log('🔍 Starting fetchSummary...');
      
      if (!user || !firestore) {
        console.log('⏳ Waiting for user/firestore...', { 
          hasUser: !!user, 
          hasFirestore: !!firestore 
        });
        return;
      }

      console.log('✅ User ID:', user.uid);
      console.log('✅ Session ID:', sessionId);

      try {
        const sessionPath = `users/${user.uid}/sessions/${sessionId}`;
        console.log('📍 Fetching session from:', sessionPath);
        
        const sessionRef = doc(firestore, sessionPath);
        const sessionSnap = await getDoc(sessionRef);

        console.log('📄 Session exists?', sessionSnap.exists());

        if (!sessionSnap.exists()) {
          console.error('❌ Session document not found!');
          setError('Session not found');
          setLoading(false);
          return;
        }

        const sessionData = sessionSnap.data();
        console.log('📊 Session data:', sessionData);
        console.log('🎯 Session status:', sessionData.status);
        console.log('📈 Completion %:', sessionData.completionPercentage);
        console.log('✅ Sufficient data:', sessionData.sufficientDataCollected);
        
        setSessionStatus(sessionData.status);

        //Check for summary data in both ended-complete AND resumed states
        const hasCompletedAssessment = sessionData.status === 'ended-complete' || 
                                       sessionData.status === 'resumed' ||
                                       sessionData.sufficientDataCollected === true;

        if (hasCompletedAssessment && sessionData.summaryData) {
          console.log('✅ Summary data found in session document');
          
          const data = {
            sessionId,
            timestamp:
              sessionData.createdAt?.toDate?.()?.toLocaleString() || new Date().toLocaleString(),
            assessments: sessionData.summaryData.assessments || [],
            comorbidityInsight: sessionData.summaryData.clinicalInsight || 'Your responses have been recorded.',
            detailedSymptoms: sessionData.summaryData.detailedSymptoms || [],
          };

          console.log('Summary data prepared from session:', data);
          setSummaryData(data);
        } else if (hasCompletedAssessment && !sessionData.summaryData) {
          console.log('Assessment complete but no summary data found');
          setError('Summary data not available');
        } else {
          console.log('Session not complete enough for summary');
        }
      } catch (err) {
        console.error('Error fetching summary:', err);
        setError('Failed to load session data');
      } finally {
        console.log('Fetch complete, setting loading to false');
        setLoading(false);
      }
    }

    fetchSummary();
  }, [user, firestore, sessionId]);

  const handleResume = async () => {
    if (!user) return;
    
    setResuming(true);
    try {
      const result = await resumeSession(user.uid, sessionId);
      
      if (result.success) {
        toast({
          title: 'Session Resumed',
          description: 'You can now continue your conversation in free-talk mode.',
        });
        router.push(`/chat?session=${sessionId}`); // Navigate to the specific session
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to resume session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume session',
        variant: 'destructive',
      });
    } finally {
      setResuming(false);
    }
  };

  const handleBackToSession = () => {
    // If already in resumed mode, go directly to the chat
    if (sessionStatus === 'resumed') {
      router.push(`/chat?session=${sessionId}`);
    } else {
      router.push('/chat');
    }
  };

  if (loading) {
    console.log('⏳ Rendering loading state...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Rendering error state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to Load Summary</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/chat')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  // Premature ending (no sufficient data collected)
  if (sessionStatus === 'ended-premature') {
    console.log('📍 Rendering premature ending state');
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Session Ended Early
            </h1>
            <p className="text-gray-600">
              You ended this session before completing all diagnostic questions. 
              Your progress has been saved.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleResume}
              disabled={resuming}
              size="lg"
              className="w-full bg-textPrimary hover:from-indigo-700 hover:to-purple-700"
            >
              {resuming ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Resume Session
                </>
              )}
            </Button>

            <Button
              onClick={() => router.push('/chat')}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            You can resume this session anytime to continue where you left off
          </p>
        </div>
      </div>
    );
  }

  // CHANGED: Show summary for BOTH ended-complete AND resumed statuses
  if ((sessionStatus === 'ended-complete' || sessionStatus === 'resumed') && summaryData) {
    console.log('✅ Rendering session summary (status:', sessionStatus, ')');
    
    // Different button text based on status
    const isAlreadyResumed = sessionStatus === 'resumed';
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <SessionSummary {...summaryData} />
        
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
            <div className="text-center space-y-4">
              {isAlreadyResumed ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Currently in Free-Talk Mode
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    You're already in free-talk mode! Continue your conversation or start a new session.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Want to Talk More?
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Assessment complete! You can resume this session for free-form conversation 
                    about anything on your mind, or start a new session with fresh diagnostic questions.
                  </p>
                </>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                {isAlreadyResumed ? (
                  <Button
                    onClick={handleBackToSession}
                    size="lg"
                    className="bg-textPrimary hover:from-indigo-700 hover:to-purple-700"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Back to Conversation
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    disabled={resuming}
                    size="lg"
                    className="bg-textPrimary hover:from-indigo-700 hover:to-purple-700"
                  >
                    {resuming ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Continue Free Talk
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => router.push('/chat')}
                  variant="outline"
                  size="lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sessions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  console.log('📍 Rendering fallback state. Status:', sessionStatus, 'Has data:', !!summaryData);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Session Not Complete Yet</h1>
        <p className="text-gray-600">
          Status: {sessionStatus || 'unknown'}<br />
          This session hasn't been completed yet.
        </p>
        <Button onClick={() => router.push('/chat')} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>
      </div>
    </div>
  );
}