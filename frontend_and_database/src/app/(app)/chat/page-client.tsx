"use client";

import { ChatLayout } from '@/components/chat/chat-layout';
import { useState, useRef, useEffect } from 'react';
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
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const {
    activeSessionId,
    setActiveSessionId,
    sessions,
    sessionsLoading,
    activeSession,
    handleNewSession,
  } = useSessionManagement();

  const typedSessions = sessions ? sessions as Session[] : undefined;

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      
      // Constrain width between 200px and 600px
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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
        {/* Left Sidebar - Resizable */}
        <div 
          className="hidden lg:flex flex-col h-full border-r bg-gray-50 overflow-y-auto relative"
          style={{ 
            width: `${sidebarWidth}px`, 
            minWidth: '200px', 
            maxWidth: '600px',
            flexShrink: 0 
          }}
        >
          <div className="flex-shrink-0 py-4">
            <SidebarHeader 
              onEndSession={handleEndSession}
              sessionStatus={activeSession?.status}
            />
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

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500 bg-transparent transition-colors group z-10"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-16 bg-gray-300 group-hover:bg-indigo-500 transition-colors rounded-l" />
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