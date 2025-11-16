'use client';

import { useState, useTransition, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createJournalEntry } from '@/lib/actions';
import { MOODS, Mood } from '@/lib/definitions';
import { Smile, Frown, Meh, Wind, Activity, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

const MOOD_ICONS: Record<Mood, React.ReactNode> = {
  Happy: <Smile className="h-6 w-6" />,
  Calm: <Wind className="h-6 w-6" />,
  Neutral: <Meh className="h-6 w-6" />,
  Sad: <Frown className="h-6 w-6" />,
  Anxious: <Activity className="h-6 w-6" />,
};

const NewEntrySchema = z.object({
  content: z.string().min(10, 'Your entry should be at least 10 characters long.'),
  mood: z.enum(MOODS, { required_error: 'Please select your mood.' }),
  userId: z.string(),
});

type NewEntryFormState = z.infer<typeof NewEntrySchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Save Entry
    </Button>
  );
}

export function NewJournalEntry() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const { user } = useUser();

  const [state, formAction] = useActionState(createJournalEntry, { message: '', errors: {} });

  const form = useForm<NewEntryFormState>({
    resolver: zodResolver(NewEntrySchema),
    defaultValues: {
      content: '',
      mood: undefined,
      userId: '',
    },
  });
  
  useEffect(() => {
    if (user) {
        form.setValue('userId', user.uid);
    }
  }, [user, form]);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success!",
        description: state.message,
      });
      setOpen(false);
      form.reset({ userId: user?.uid || '' });
      setSelectedMood(null);
    } else if (state.message && !state.success) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, toast, form, user]);

  const onFormAction = (formData: FormData) => {
    formData.set('mood', selectedMood || '');
    formAction(formData);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button disabled={!user}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Entry
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg w-[90vw] flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline">How are you feeling?</SheetTitle>
          <SheetDescription>
            Take a moment to write down your thoughts. Don't worry about grammar or spelling.
          </SheetDescription>
        </SheetHeader>
        <form action={onFormAction} className="flex-1 flex flex-col gap-6 py-4">
          <input type="hidden" name="userId" value={user?.uid || ''} />
          <div className="grid gap-2">
            <Label>How are you feeling right now?</Label>
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
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  {MOOD_ICONS[mood]}
                  <span className="text-xs font-medium">{mood}</span>
                </button>
              ))}
            </div>
            {form.formState.errors.mood && <p className="text-sm font-medium text-destructive">{form.formState.errors.mood.message}</p>}
          </div>

          <div className="grid gap-2 flex-1">
            <Label htmlFor="content">Your thoughts</Label>
            <Textarea
              id="content"
              name="content"
              placeholder="Start writing here..."
              className="min-h-[200px] flex-1 resize-none"
              onChange={(e) => form.setValue('content', e.target.value, { shouldValidate: true })}
            />
            {form.formState.errors.content && <p className="text-sm font-medium text-destructive">{form.formState.errors.content.message}</p>}
          </div>
          
          <SheetFooter>
            <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
            </SheetClose>
            <SubmitButton />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
