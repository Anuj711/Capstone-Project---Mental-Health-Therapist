import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { buildQuestionnaireItems } from '@/lib/questionnaireItems';
import { useToast } from '@/hooks/use-toast';
import { Session } from '@/lib/definitions';

export function useSessionManagement() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const isCreatingSession = useRef(false);

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
    try {
      const sessionName = getNextSessionName();
      const newSessionRef = await addDoc(
        collection(firestore, `users/${user.uid}/sessions`),
        {
          createdAt: serverTimestamp(),
          name: sessionName,
          status: 'active',
          completionPercentage: 0,
          totalQuestions: 0,
          answeredQuestions: 0,
        }
      );

      // Initialize questionnaire subcollection
      const questionnaireCollection = collection(newSessionRef, 'questions');
      const questionnaires = buildQuestionnaireItems();

      for (const [assessmentName, questions] of Object.entries(questionnaires)) {
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

  // Set first session as active or create a new one if none exist
  useEffect(() => {
    if (sessionsLoading) return;

    if (sessions && sessions.length > 0) {
      if (activeSessionId === null) {
        setActiveSessionId(sessions[0].id);
      }
    } else if (user && sessions && sessions.length === 0) {
      handleNewSession();
    }
  }, [sessions, sessionsLoading, user, activeSessionId]);

  return {
    activeSessionId,
    setActiveSessionId,
    sessions,
    sessionsLoading,
    activeSession,
    handleNewSession,
  };
}
