'use client';

import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { JournalList } from "@/components/journal/journal-list";
import { NewJournalEntry } from "@/components/journal/new-journal-entry";
import { JournalFilters } from "@/components/journal/journal-filters";
import { useState } from 'react';
import { Mood } from '@/lib/definitions';

export default function JournalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | 'All'>('All');

  const journalEntriesCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'journalEntries');
  }, [user, firestore]);

  const { data: initialEntries, isLoading: areEntriesLoading } = useCollection(journalEntriesCollection);

  // Filter entries based on search and mood
  const filteredEntries = initialEntries?.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      entry.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = selectedMood === 'All' || entry.mood === selectedMood;
    return matchesSearch && matchesMood;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">My Journal</h1>
          <p className="text-gray-600 mt-2">
            Capture your thoughts, emotions, and daily reflections
          </p>
        </div>
        <NewJournalEntry />
      </div>

      {/* Filters Section */}
      <JournalFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedMood={selectedMood}
        setSelectedMood={setSelectedMood}
      />

      {/* Journal List */}
      <JournalList 
        initialEntries={filteredEntries} 
        isLoading={isUserLoading || areEntriesLoading} 
      />
    </div>
  );
}