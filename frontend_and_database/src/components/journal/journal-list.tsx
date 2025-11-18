'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { JournalEntry, Mood } from "@/lib/definitions";
import { format } from 'date-fns';
import { Smile, Frown, Meh, Wind, Activity, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { deleteJournalEntryClient } from '@/lib/client-actions';

const MOOD_DETAILS: Record<Mood, { icon: React.ReactNode; color: string }> = {
  Happy: { icon: <Smile className="h-5 w-5" />, color: "bg-green-500/20 text-green-700 border-green-300" },
  Calm: { icon: <Wind className="h-5 w-5" />, color: "bg-blue-500/20 text-blue-700 border-blue-300" },
  Neutral: { icon: <Meh className="h-5 w-5" />, color: "bg-gray-500/20 text-gray-700 border-gray-300" },
  Sad: { icon: <Frown className="h-5 w-5" />, color: "bg-purple-500/20 text-purple-700 border-purple-300" },
  Anxious: { icon: <Activity className="h-5 w-5" />, color: "bg-yellow-500/20 text-yellow-700 border-yellow-300" },
};

function JournalCard({ entry, onInitiateDelete }: { entry: JournalEntry; onInitiateDelete: (entryId: string) => void }) {
  const moodDetail = MOOD_DETAILS[entry.mood];
  const createdAt = entry.createdAt?.seconds ? new Date(entry.createdAt.seconds * 1000) : new Date();

  return (
    <Card className="hover:shadow-md transition-shadow duration-300 flex flex-col group">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardDescription>{format(createdAt, "MMMM d, yyyy 'at' h:mm a")}</CardDescription>
          <Badge variant="outline" className={`flex items-center gap-2 ${moodDetail.color}`}>
            {moodDetail.icon}
            {entry.mood}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground line-clamp-4">{entry.content}</p>
      </CardContent>
      <CardFooter className="justify-end">
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onInitiateDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
      </CardFooter>
    </Card>
  );
}

export function JournalList({ initialEntries, isLoading }: { initialEntries: JournalEntry[]; isLoading: boolean }) {
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

  const handleInitiateDelete = (entryId: string) => {
    setEntryToDelete(entryId);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !user) return;

    const result = await deleteJournalEntryClient(user.uid, entryToDelete);

    if (result.success) {
      toast({ title: "Entry deleted", description: "Your journal entry has been removed." });
    } else {
      toast({ title: "Error", description: result.message, variant: 'destructive' });
    }
    setEntryToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (initialEntries.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-lg">
        <h2 className="text-xl font-semibold">No entries yet</h2>
        <p className="text-muted-foreground mt-2">Click "New Entry" to start your mindful journey.</p>
      </div>
    );
  }

  return (
    <AlertDialog>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialEntries.map((entry) => (
          <JournalCard key={entry.id} entry={entry} onInitiateDelete={handleInitiateDelete} />
        ))}
      </div>
      <AlertDialogContent>
        {entryToDelete && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this journal entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
