import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionStatus } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';

interface SidebarHeaderProps {
  onEndSession: () => void;
  sessionStatus?: SessionStatus;
}

export function SidebarHeader({ onEndSession, sessionStatus = 'active' }: SidebarHeaderProps) {
  const getStatusBadge = () => {
    switch (sessionStatus) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'ended-complete':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Completed</Badge>;
      case 'ended-premature':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Ended</Badge>;
      case 'resumed':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Free Talk</Badge>;
      default:
        return null;
    }
  };

  const canEndSession = sessionStatus === 'active';

  return (
    <div className="space-y-4 px-2">
      <Card className="border-gray-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Avatar className="h-10 w-10 border-4 border-indigo-100">
              <AvatarImage src="/bot.png" alt="AI Therapist" className="object-cover" />
              <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <Sparkles className="h-10 w-10"/>
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-sm font-semibold">Your AI Therapist</CardTitle>
          <CardDescription className="text-xs">Always here to listen and support you</CardDescription>
          <div className="flex justify-center mt-2">
            {getStatusBadge()}
          </div>
        </CardHeader>
      </Card>

      {canEndSession && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Session Control</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button 
              onClick={onEndSession}
              variant="destructive" 
              className="w-full bg-red-600 hover:bg-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              End Session
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}