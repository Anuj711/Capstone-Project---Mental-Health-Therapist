'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MOODS, Mood, JournalEntry } from '@/lib/definitions';
import { Smile, Frown, Meh, Wind, Activity, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { updateJournalEntryClient } from '@/lib/client-actions';

const MOOD_ICONS: Record<Mood, React.ReactNode> = {
  Happy: <Smile className="h-6 w-6" />,
  Calm: <Wind className="h-6 w-6" />,
  Neutral: <Meh className="h-6 w-6" />,
  Sad: <Frown className="h-6 w-6" />,
  Anxious: <Activity className="h-6 w-6" />,
};

const EditEntrySchema = z.object({
  content: z.string().min(10, 'Your entry should be at least 10 characters long.'),
  mood: z.enum(MOODS, { required_error: 'Please select your mood.' }),
});

type EditEntryFormState = z.infer<typeof EditEntrySchema>;

interface EditJournalEntryProps {
  entry: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditJournalEntry({ entry, open, onOpenChange }: EditJournalEntryProps) {
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();

  const form = useForm<EditEntryFormState>({
    resolver: zodResolver(EditEntrySchema),
    defaultValues: {
      content: '',
      mood: undefined,
    },
  });

  // Update form when entry changes
  useEffect(() => {
    if (entry) {
      form.setValue('content', entry.content);
      form.setValue('mood', entry.mood);
      setSelectedMood(entry.mood);
    }
  }, [entry, form]);

  const onSubmit = async (data: EditEntryFormState) => {
    if (!user || !entry) return;

    setIsSubmitting(true);
    
    try {
      const result = await updateJournalEntryClient(user.uid, entry.id, {
        content: data.content,
        mood: data.mood,
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: "Your journal entry has been updated.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Journal Entry</DialogTitle>
          <DialogDescription>
            Update your thoughts and feelings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>How are you feeling?</Label>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => {
                    setSelectedMood(mood);
                    form.setValue('mood', mood, { shouldValidate: true });
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 w-20 h-20 transition-all",
                    selectedMood === mood
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  )}
                >
                  {MOOD_ICONS[mood]}
                  <span className="text-xs font-medium">{mood}</span>
                </button>
              ))}
            </div>
            {form.formState.errors.mood && (
              <p className="text-sm font-medium text-red-600">
                {form.formState.errors.mood.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">Your thoughts</Label>
            <Textarea
              id="edit-content"
              {...form.register('content')}
              placeholder="Start writing here..."
              className="min-h-[200px] resize-none"
            />
            {form.formState.errors.content && (
              <p className="text-sm font-medium text-red-600">
                {form.formState.errors.content.message}
              </p>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-textPrimary hover:bg-textPrimary/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}