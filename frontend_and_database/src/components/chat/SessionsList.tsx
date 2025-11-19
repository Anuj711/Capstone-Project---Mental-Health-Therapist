import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MessageSquare, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Session {
  id: string;
  name: string;
}

interface SessionsListProps {
  sessions: Session[] | undefined | null;
  sessionsLoading: boolean;
  activeSessionId: string | null;
  editingSessionId: string | null;
  tempSessionName: string;
  canDelete: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRename: (session: Session) => void;
  onRenameChange: (name: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDelete: (id: string) => void;
}

export function SessionsList({
  sessions,
  sessionsLoading,
  activeSessionId,
  editingSessionId,
  tempSessionName,
  canDelete,
  onSelectSession,
  onNewSession,
  onRename,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDelete,
}: SessionsListProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0 border-gray-200 mx-2">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-sm font-semibold">Past Sessions</CardTitle>
        <CardDescription className="text-xs">Review your history</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 gap-0 p-0">
        <div className="px-6 pb-3 flex-shrink-0">
          <Button 
            className="w-full bg-textPrimary hover:to-textSecondary hover:text-black text-white" 
            onClick={onNewSession}
            size="sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Session
          </Button>
        </div>

        <ScrollArea className="flex-1 w-full" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <div className="flex flex-col gap-1 px-6 pb-6">
            {sessionsLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
            ) : sessions && sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-1 group">
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-1 w-full">
                      <Input
                        value={tempSessionName}
                        onChange={(e) => onRenameChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onRenameSubmit();
                          if (e.key === 'Escape') onRenameCancel();
                        }}
                        autoFocus
                        className="h-8 text-sm flex-1 min-w-[120px]"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onRenameSubmit}>
                        <span className="text-xs">✓</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onRenameCancel}>
                        <span className="text-xs">✕</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        variant={activeSessionId === session.id ? 'secondary' : 'ghost'} 
                        className="justify-start flex-1 h-8 text-sm whitespace-nowrap overflow-hidden text-ellipsis"
                        onClick={() => onSelectSession(session.id)}
                      >
                        <MessageSquare className="mr-1 h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{session.name}</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRename(session)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                          disabled={!canDelete}
                          onClick={() => onDelete(session.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No sessions yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}