"use client";

import { ChatLayout } from '@/components/chat/chat-layout';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Session } from '@/lib/definitions';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { SidebarHeader } from '@/components/chat/SidebarHeader';
import { SessionsList } from '@/components/chat/SessionsList';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { resumeSession } from '@/lib/actions';

/*uncomment to test session summary generation*/
//import { resumeSession, generateSessionSummary } from '@/lib/actions';
//import { FileText, Loader2 } from 'lucide-react';

export default function ChatPageClient({
  deleteChatSession,
  renameChatSession,
  endSessionManually,
}: {
  deleteChatSession: (userId: string, sessionId: string) => any;
  renameChatSession: (userId: string, sessionId: string, newName: string) => any;
  endSessionManually: (userId: string, sessionId: string) => any;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [tempSessionName, setTempSessionName] = useState('');
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const {
    activeSessionId,
    setActiveSessionId,
    sessions,
    sessionsLoading,
    activeSession,
    handleNewSession,
  } = useSessionManagement();

  const typedSessions = sessions ? sessions as Session[] : undefined;

  {/*uncomment to test session summary generation*/}
  /*
  // TEST FUNCTION - Generate summary manually
  const handleGenerateSummary = async () => {
    if (!user || !activeSessionId) {
      toast({
        title: 'Error',
        description: 'No active session',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingSummary(true);
    try {
      const result = await generateSessionSummary(user.uid, activeSessionId);
      
      if (result.success) {
        toast({
          title: 'Summary Generated',
          description: 'Redirecting to summary page...',
        });
        setTimeout(() => {
          router.push(`/session-summary/${activeSessionId}`);
        }, 500);
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to generate summary',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate summary',
        variant: 'destructive',
      });
    } finally {
      setGeneratingSummary(false);
    }
  };
  
*/
  const handleDeleteConfirm = async () => {
    if (!sessionToDelete || !user) return;

    const result = await deleteChatSession(user.uid, sessionToDelete);

    if (result.success) {
      toast({ title: "Session deleted", description: "The session has been removed." });
      if (activeSessionId === sessionToDelete) {
        const remainingSessions = typedSessions?.filter(s => s.id !== sessionToDelete);
        setActiveSessionId(remainingSessions && remainingSessions.length > 0 ? remainingSessions[0].id : null);
      }
    } else {
      toast({ title: "Error", description: result.message, variant: 'destructive' });
    }
    setSessionToDelete(null);
  };

  const handleEndSession = () => {
    setShowEndSessionDialog(true);
  };

  const handleEndSessionConfirm = async () => {
    if (!user || !activeSessionId) return;

    const result = await endSessionManually(user.uid, activeSessionId);

    if (result.success) {
      toast({
        title: "Session Ended",
        description: "Your therapy session has been concluded.",
      });
      setShowEndSessionDialog(false);
      router.push(`/session-summary/${activeSessionId}`);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: 'destructive',
      });
      setShowEndSessionDialog(false);
    }
  };

  const handleRename = (session: { id: string; name: string }) => {
    setEditingSessionId(session.id);
    setTempSessionName(session.name);
  };

  const handleRenameSubmit = async () => {
    if (!editingSessionId || !user) return;
    
    const trimmedName = tempSessionName.trim();
    
    if (!trimmedName) {
      toast({ 
        title: "Invalid Name", 
        description: "Session name cannot be empty.",
        variant: 'destructive' 
      });
      setEditingSessionId(null);
      return;
    }
    
    const nameExists = typedSessions?.some(
      s => s.id !== editingSessionId && s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (nameExists) {
      toast({ 
        title: "Name Already Exists", 
        description: "A session with this name already exists. Please choose a different name.",
        variant: 'destructive' 
      });
      return;
    }

    const result = await renameChatSession(user.uid, editingSessionId, trimmedName);

    if (result.success) {
      toast({ title: "Session renamed successfully" });
      setEditingSessionId(null);
    } else {
      toast({ title: "Error", description: result.message, variant: 'destructive' });
    }
  };

  const handleRenameCancel = () => {
    setEditingSessionId(null);
    setTempSessionName('');
  };

  const handleResume = async (sessionId: string) => {
    if (!user) return;
    
    const result = await resumeSession(user.uid, sessionId);
    
    if (result.success) {
      toast({
        title: 'Session Resumed',
        description: 'You can now continue your conversation.',
      });
      setActiveSessionId(sessionId);
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Failed to resume session',
        variant: 'destructive',
      });
    }
  };
  
  const canDelete = typedSessions ? typedSessions.length > 1 : false;

  return (
    <>
      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this chat session and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setSessionToDelete(null)} variant="outline">Cancel</Button>
            <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Therapy Session?</DialogTitle>
            <DialogDescription>
              {activeSession?.status === 'active' && activeSession?.completionPercentage === 100 ? (
                <>
                  You've completed all diagnostic questions! Ending now will save your progress and generate your summary.
                  You can resume this session later for free-talk.
                </>
              ) : (
                <>
                  Are you sure you want to end this session? You haven't completed all diagnostic questions yet.
                  Your progress will be saved, and you can resume or start a new session anytime.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowEndSessionDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={handleEndSessionConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-screen w-full flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden lg:flex flex-col w-[300px] h-full border-r bg-gray-50 overflow-y-auto">
          <div className="flex-shrink-0 py-4">
            <SidebarHeader 
              onEndSession={handleEndSession}
              sessionStatus={activeSession?.status}
            />
            
            {/* TEST BUTTON - uncomment to test session summary generation */}
            {/*}
            <div className="px-4 mt-4">
              <Button
                onClick={handleGenerateSummary}
                disabled={generatingSummary || !activeSessionId}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                {generatingSummary ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    [TEST] Generate Summary
                  </>
                )}
              </Button>
            </div>
            */}
          </div>
          
          
          <div className="flex-1 min-h-[400px] pb-4">
            <SessionsList
              sessions={typedSessions}
              sessionsLoading={sessionsLoading}
              activeSessionId={activeSessionId}
              editingSessionId={editingSessionId}
              tempSessionName={tempSessionName}
              canDelete={canDelete}
              onSelectSession={setActiveSessionId}
              onNewSession={handleNewSession}
              onRename={handleRename}
              onRenameChange={setTempSessionName}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={handleRenameCancel}
              onDelete={setSessionToDelete}
              onResume={handleResume}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 h-full overflow-hidden">
          {activeSessionId ? (
            <ChatLayout 
              sessionId={activeSessionId} 
              sessionName={activeSession?.name || ''} 
              key={activeSessionId} 
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading or creating session...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}