'use client';

import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { JournalList } from "@/components/journal/journal-list";
import { NewJournalEntry } from "@/components/journal/new-journal-entry";


export default function JournalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const journalEntriesCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'journalEntries');
  }, [user, firestore]);

  const { data: initialEntries, isLoading: areEntriesLoading } = useCollection(journalEntriesCollection);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">My Journal</h1>
          <p className="text-muted-foreground">
            A space for your thoughts, feelings, and reflections.
          </p>
        </div>
        <NewJournalEntry />
      </div>
      <JournalList 
        initialEntries={initialEntries || []} 
        isLoading={isUserLoading || areEntriesLoading} 
      />
    </div>
  );
}
