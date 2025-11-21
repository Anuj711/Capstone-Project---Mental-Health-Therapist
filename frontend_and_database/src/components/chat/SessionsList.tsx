import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Pencil, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Session } from '@/lib/definitions';

interface SessionsListProps {
  sessions: Session[] | undefined;
  sessionsLoading: boolean;
  activeSessionId: string | null;
  editingSessionId: string | null;
  tempSessionName: string;
  canDelete: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRename: (session: { id: string; name: string }) => void;
  onRenameChange: (name: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDelete: (id: string) => void;
  onResume: (id: string) => void;
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
  onResume,
}: SessionsListProps) {
  return (
    <Card className="flex flex-col h-full border-gray-200 mx-2 overflow-hidden">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <CardTitle className="text-sm font-semibold">Past Sessions</CardTitle>
        <CardDescription className="text-xs">Review your history</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 p-0 overflow-hidden">
        <div className="px-6 pb-3 pt-3 flex-shrink-0">
          <Button
            className="w-full bg-textPrimary hover:to-textSecondary hover:text-black text-white"
            onClick={onNewSession}
            size="sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Session
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-2">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 pb-6">
              {sessionsLoading ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Loading...
                </p>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="group flex items-center justify-between w-full px-3 py-2 rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 transition"
                  >
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
                          className="h-8 text-sm flex-1 min-w-0"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={onRenameSubmit}
                        >
                          <span className="text-xs">✓</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={onRenameCancel}
                        >
                          <span className="text-xs">✕</span>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectSession(session.id)}
                          className="flex flex-col text-left flex-1 min-w-0"
                        >
                          <span className="text-sm font-medium truncate">
                            {session.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {session.completionPercentage === 100
                              ? 'Completed'
                              : `${session.completionPercentage}% complete`}
                          </span>
                        </button>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                          <button
                            onClick={() => onResume(session.id)}
                            title="Resume"
                            className="p-1 hover:text-green-600"
                          >
                            <PlayCircle className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onRename(session)}
                            title="Rename"
                            className="p-1 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            disabled={!canDelete}
                            onClick={() => onDelete(session.id)}
                            title="Delete"
                            className="p-1 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No sessions yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}