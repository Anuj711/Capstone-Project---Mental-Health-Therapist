import { useMemo } from 'react';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Mood, MoodDataItem, JournalEntry as JournalEntryType } from '@/lib/definitions';

export function useDashboardData() {
  const { user } = useUser();
  const firestore = useFirestore();

  const journalEntriesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'journalEntries'),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const recentEntriesQuery = useMemoFirebase(() => {
    if (!journalEntriesQuery) return null;
    return query(journalEntriesQuery, limit(5));
  }, [journalEntriesQuery]);

  const chatSessionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'sessions'));
  }, [user, firestore]);

  const { data: allEntries } = useCollection<JournalEntryType>(journalEntriesQuery);
  const { data: recentEntries } = useCollection<JournalEntryType>(recentEntriesQuery);
  const { data: allSessions } = useCollection(chatSessionsQuery);

  const moodData: MoodDataItem[] = useMemo(() => {
    const moodCounts: Record<Mood, number> = {
      Happy: 0,
      Calm: 0,
      Neutral: 0,
      Sad: 0,
      Anxious: 0,
    };
    if (allEntries) {
      allEntries.forEach((entry) => {
        if (entry.mood && moodCounts[entry.mood] !== undefined) {
          moodCounts[entry.mood]++;
        }
      });
    }
    return Object.entries(moodCounts).map(([mood, count]) => ({
      mood: mood as Mood,
      count,
    }));
  }, [allEntries]);

  const getMoodTrend = () => {
    if (!moodData || moodData.length === 0) return 'Neutral';
    const positiveCount = (moodData.find(m => m.mood === 'Happy')?.count || 0) +
                          (moodData.find(m => m.mood === 'Calm')?.count || 0);
    const negativeCount = (moodData.find(m => m.mood === 'Sad')?.count || 0) +
                          (moodData.find(m => m.mood === 'Anxious')?.count || 0);
    
    if (positiveCount > negativeCount) return 'Positive';
    if (negativeCount > positiveCount) return 'Negative';
    return 'Balanced';
  };

  return {
    allEntries: allEntries ?? [],
    recentEntries: recentEntries ?? [],
    allSessions: allSessions ?? [],
    moodData,
    moodTrend: getMoodTrend(),
  };
}