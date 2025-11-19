import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { buildQuestionnaireItems } from '@/lib/questionnaireItems';
import { useToast } from '@/hooks/use-toast';

export function useSessionManagement() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const isCreatingSession = useRef(false);

  const sessionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/sessions`), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: sessions, isLoading: sessionsLoading } = useCollection(sessionsQuery);
  const activeSession = sessions?.find(s => s.id === activeSessionId);

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

  const handleNewSession = async () => {
    if (!user || !firestore || isCreatingSession.current || !sessionsQuery) return;
    
    isCreatingSession.current = true;
    try {
      const sessionName = getNextSessionName();
      const newSessionRef = await addDoc(collection(firestore, `users/${user.uid}/sessions`), {
        createdAt: serverTimestamp(),
        name: sessionName
      });

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
      console.error("Failed to create new session:", error);
      toast({ title: 'Error', description: 'Could not create a new session.', variant: 'destructive' });
    } finally {
      isCreatingSession.current = false;
    }
  };

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