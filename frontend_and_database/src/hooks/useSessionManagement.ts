import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { buildQuestionnaireItems } from '@/lib/questionnaireItems';
import { useToast } from '@/hooks/use-toast';
import { Session } from '@/lib/definitions';
import { useSearchParams } from 'next/navigation';

export function useSessionManagement() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const isCreatingSession = useRef(false);
  const hasInitialized = useRef(false);

  // Get session ID from URL if present
  const urlSessionId = searchParams.get('session');

  // Firestore query for sessions
  const sessionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/sessions`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  // Fetch sessions from Firestore
  const { data: rawSessions, isLoading: sessionsLoading } = useCollection(sessionsQuery);

  // Map raw Firestore docs to typed Session[]
  const sessions: Session[] | undefined = rawSessions?.map(s => ({
    id: s.id,
    name: s.name || 'Unnamed Session',
    status: s.status || 'active',
    completionPercentage: s.completionPercentage || 0,
    createdAt: s.createdAt || new Date(),
    totalQuestions: s.totalQuestions || 0,
    answeredQuestions: s.answeredQuestions || 0,
  }));

  const activeSession = sessions?.find(s => s.id === activeSessionId);

  // Generate a unique new session name
  const getNextSessionName = () => {
    if (!sessions) return 'Session 1';
    let counter = 1;
    let name = `Session ${counter}`;
    while (sessions.some(s => s.name === name)) {
      counter++;
      name = `Session ${counter}`;
    }
    return name;
  };

  // Create a new session
  const handleNewSession = async () => {
    if (!user || !firestore || isCreatingSession.current) return;

    isCreatingSession.current = true;
    const initialUnanswered = [
      "PHQ-9_Q1", "PHQ-9_Q2", "PHQ-9_Q3", "PHQ-9_Q4", "PHQ-9_Q5", "PHQ-9_Q6", "PHQ-9_Q7", "PHQ-9_Q8", "PHQ-9_Q9",
      "GAD-7_Q1", "GAD-7_Q2", "GAD-7_Q3", "GAD-7_Q4", "GAD-7_Q5", "GAD-7_Q6", "GAD-7_Q7"
    ];

    try {
      const sessionName = getNextSessionName();
      const newSessionRef = await addDoc(
        collection(firestore, `users/${user.uid}/sessions`),
        {
          createdAt: serverTimestamp(),
          name: sessionName,
          status: 'active',
          completionPercentage: 0,
          totalQuestions: 16,
          answeredQuestions: 0,
          sufficientDataCollected: false,
          traumaDetected: false,
          unanswered_question_ids: initialUnanswered,
          question_tracker: {
            current_qs_id: "PHQ-9_Q1",
            next_qs_id: "PHQ-9_Q2",
            current_qs_index: 0
          }
        }
      );

      // Initialize questionnaire subcollection (only PHQ-9 and GAD-7)
      const questionnaireCollection = collection(newSessionRef, 'questions');
      const questionnaires = buildQuestionnaireItems();
      
      // Only create PHQ-9 and GAD-7, not PCL-5
      for (const [assessmentName, questions] of Object.entries(questionnaires)) {
        if (assessmentName === 'PCL-5') continue; // Skip PCL-5 initially
        
        const questionnaireDoc = doc(questionnaireCollection, assessmentName);
        await setDoc(questionnaireDoc, {
          createdAt: serverTimestamp(),
          questions,
        });
      }

      setActiveSessionId(newSessionRef.id);
    } catch (error) {
      console.error('Failed to create new session:', error);
      toast({
        title: 'Error',
        description: 'Could not create a new session.',
        variant: 'destructive',
      });
    } finally {
      isCreatingSession.current = false;
    }
  };

  // Set session as active - prioritize URL param, then first session, then create new
  useEffect(() => {
    if (sessionsLoading || hasInitialized.current) return;

    if (sessions && sessions.length > 0) {
      // If URL has session param, try to use that
      if (urlSessionId) {
        const sessionExists = sessions.some(s => s.id === urlSessionId);
        if (sessionExists) {
          console.log('✅ Setting active session from URL:', urlSessionId);
          setActiveSessionId(urlSessionId);
          hasInitialized.current = true;
          return;
        }
      }
      
      // Otherwise use first session
      if (activeSessionId === null) {
        setActiveSessionId(sessions[0].id);
        hasInitialized.current = true;
      }
    } else if (user && sessions && sessions.length === 0) {
      handleNewSession();
      hasInitialized.current = true;
    }
  }, [sessions, sessionsLoading, user, activeSessionId, urlSessionId]);

  return {
    activeSessionId,
    setActiveSessionId,
    sessions,
    sessionsLoading,
    activeSession,
    handleNewSession,
  };
}
