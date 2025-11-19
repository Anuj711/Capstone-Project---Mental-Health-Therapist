'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { JournalEntry, Mood } from "@/lib/definitions";
import { format } from 'date-fns';
import { Smile, Frown, Meh, Wind, Activity, Trash2, Eye, Edit } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { deleteJournalEntryClient } from '@/lib/client-actions';
import { cn } from '@/lib/utils';
import { EditJournalEntry } from '@/components/journal/edit-jounal-entry';

const MOOD_DETAILS: Record<Mood, { icon: React.ReactNode; color: string; bgColor: string }> = {
  Happy: { 
    icon: <Smile className="h-4 w-4" />, 
    color: "text-green-700 border-green-300", 
    bgColor: "bg-green-50" 
  },
  Calm: { 
    icon: <Wind className="h-4 w-4" />, 
    color: "text-blue-700 border-blue-300", 
    bgColor: "bg-blue-50" 
  },
  Neutral: { 
    icon: <Meh className="h-4 w-4" />, 
    color: "text-gray-700 border-gray-300", 
    bgColor: "bg-gray-50" 
  },
  Sad: { 
    icon: <Frown className="h-4 w-4" />, 
    color: "text-pink-700 border-pink-300", 
    bgColor: "bg-pink-50" 
  },
  Anxious: { 
    icon: <Activity className="h-4 w-4" />, 
    color: "text-yellow-700 border-yellow-300", 
    bgColor: "bg-yellow-50" 
  },
};

interface JournalCardProps {
  entry: JournalEntry;
  onInitiateDelete: (entryId: string) => void;
  onView: (entry: JournalEntry) => void;
  onEdit: (entry: JournalEntry) => void;
  featured?: boolean;
}

function JournalCard({ entry, onInitiateDelete, onView, onEdit, featured = false }: JournalCardProps) {
  const moodDetail = MOOD_DETAILS[entry.mood];
  const createdAt = entry.createdAt?.seconds ? new Date(entry.createdAt.seconds * 1000) : new Date();

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all duration-300 flex flex-col group border-gray-200",
        featured && "md:col-span-2 lg:row-span-2"
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <CardDescription className="text-sm text-gray-500">
            {format(createdAt, "MMMM d, yyyy 'at' h:mm a")}
          </CardDescription>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-2 w-fit rounded-full px-3 py-1",
            moodDetail.bgColor,
            moodDetail.color
          )}
        >
          {moodDetail.icon}
          <span className="font-semibold text-xs">{entry.mood}</span>
        </Badge>
      </CardHeader>
      
      <CardContent className="flex-grow">
        {featured ? (
          <>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 line-clamp-2">
              {entry.content.split('\n')[0] || entry.content.substring(0, 60)}
            </h3>
            <p className="text-gray-600 line-clamp-6 leading-relaxed">
              {entry.content}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-gray-700 mb-2 line-clamp-1">
              {entry.content.split('\n')[0] || entry.content.substring(0, 50)}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
              {entry.content}
            </p>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(entry)}
            className="h-9 rounded-full bg-gray-50 hover:bg-textPrimary text-gray-700"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(entry)}
            className="h-9 rounded-full bg-gray-50 hover:bg-textPrimary text-gray-700"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
            onClick={() => onInitiateDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
      </CardFooter>
    </Card>
  );
}

interface JournalListProps {
  initialEntries: JournalEntry[];
  isLoading: boolean;
}

export function JournalList({ initialEntries, isLoading }: JournalListProps) {
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

  const handleInitiateDelete = (entryId: string) => {
    setEntryToDelete(entryId);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !user) return;

    const result = await deleteJournalEntryClient(user.uid, entryToDelete);

    if (result.success) {
      toast({ 
        title: "Entry deleted", 
        description: "Your journal entry has been removed." 
      });
    } else {
      toast({ 
        title: "Error", 
        description: result.message, 
        variant: 'destructive' 
      });
    }
    setEntryToDelete(null);
  };

  const handleView = (entry: JournalEntry) => {
    setViewEntry(entry);
  };

  const handleEdit = (entry: JournalEntry) => {
    setViewEntry(null); // Close view dialog if open
    setEditEntry(entry);
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-gray-200">
            <CardHeader className="space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (initialEntries.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-2xl bg-white">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No entries yet</h2>
          <p className="text-gray-600">
            Start your mindful journey by creating your first journal entry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-auto">
          {initialEntries.map((entry, index) => (
            <JournalCard 
              key={entry.id} 
              entry={entry} 
              onInitiateDelete={handleInitiateDelete}
              onView={handleView}
              onEdit={handleEdit}
              featured={index === 0}
            />
          ))}
        </div>
        
        <AlertDialogContent>
          {entryToDelete && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this journal entry from your records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEntryToDelete(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* View Entry Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={(open) => !open && setViewEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">Journal Entry</DialogTitle>
                    <DialogDescription>
                      {format(
                        viewEntry.createdAt?.seconds 
                          ? new Date(viewEntry.createdAt.seconds * 1000) 
                          : new Date(), 
                        "EEEE, MMMM d, yyyy 'at' h:mm a"
                      )}
                    </DialogDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5",
                      MOOD_DETAILS[viewEntry.mood].bgColor,
                      MOOD_DETAILS[viewEntry.mood].color
                    )}
                  >
                    {MOOD_DETAILS[viewEntry.mood].icon}
                    <span className="font-semibold">{viewEntry.mood}</span>
                  </Badge>
                </div>
              </DialogHeader>
              <div className="mt-4">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {viewEntry.content}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewEntry(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleEdit(viewEntry)}
                  className="bg-textPrimary hover:bg-textPrimary/90 text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Entry
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <EditJournalEntry
        entry={editEntry}
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
      />
    </>
  );
}