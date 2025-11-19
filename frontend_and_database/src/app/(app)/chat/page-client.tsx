"use client";

import { ChatLayout } from '@/components/chat/chat-layout';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
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

export default function ChatPageClient({
  deleteChatSession,
  renameChatSession
}: {
  deleteChatSession: (userId: string, sessionId: string) => any;
  renameChatSession: (userId: string, sessionId: string, newName: string) => any;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [tempSessionName, setTempSessionName] = useState('');
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);

  const {
    activeSessionId,
    setActiveSessionId,
    sessions,
    sessionsLoading,
    activeSession,
    handleNewSession,
  } = useSessionManagement();

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete || !user) return;

    const result = await deleteChatSession(user.uid, sessionToDelete);

    if (result.success) {
      toast({ title: "Session deleted", description: "The session has been removed." });
      if (activeSessionId === sessionToDelete) {
        const remainingSessions = sessions?.filter(s => s.id !== sessionToDelete);
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

  const handleEndSessionConfirm = () => {
    toast({
      title: "Session Ended",
      description: "Your therapy session has been concluded. You can start a new one anytime.",
    });
    setShowEndSessionDialog(false);
    handleNewSession();
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
    
    const nameExists = sessions?.some(
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
  
  const canDelete = sessions ? sessions.length > 1 : false;

  return (
    <>
      <AlertDialog>
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0">
          {/* Left Sidebar */}
          <div className="hidden lg:flex flex-col w-[300px] h-full gap-4 overflow-hidden border-r">
            <SidebarHeader onEndSession={handleEndSession} />
            
            <SessionsList
              sessions={sessions}
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
            />
          </div>

          {/* Main Chat Area */}
          <div className="h-full w-full flex flex-col min-h-0">
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
        
        {/* Delete Session Dialog */}
        <AlertDialogContent>
          {sessionToDelete && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this chat session and all its messages.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button onClick={() => setSessionToDelete(null)}>Cancel</Button>
                <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                  Delete
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Dialog */}
      <Dialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Therapy Session?</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this session? Your conversation will be saved, and you can start a new session anytime.
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
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}