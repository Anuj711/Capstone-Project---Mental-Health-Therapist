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
        return <Badge className="text-[0.6rem] text-white bg-green-700">Active</Badge>;
      case 'ended-complete':
        return <Badge className="text-[0.6rem] text-white bg-blue-600">Completed</Badge>;
      case 'ended-premature':
        return <Badge className="text-[0.6rem] text-white bg-orange-600">Ended</Badge>;
      case 'resumed':
        return <Badge className="text-[0.6rem] text-white bg-textPrimary">Free Talk</Badge>;
      default:
        return null;
    }
  };

  const canEndSession = sessionStatus === 'active';

  return (
    <div className="space-y-4 px-2">
      <Card className="border-gray-200">
        <CardHeader className="text-center py-2">
          <div className="flex justify-center mb-2">
            <Avatar className="h-8 w-8 border-2 border-indigo-100">
              <AvatarImage src="/bot.png" alt="AI Therapist" className="object-cover" />
              <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <Sparkles className="h-8 w-"/>
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-xs font-semibold">Your AI Therapist</CardTitle>
          <CardDescription className="text-[0.6rem]">Always here to listen and support you</CardDescription>
          <div className="flex justify-center mt-2">
            {getStatusBadge()}
          </div>
        </CardHeader>
      </Card>

      {canEndSession && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-gray-700">Session Control</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <Button 
              onClick={onEndSession}
              variant="destructive" 
              className="text-[0.6rem] w-full bg-red-600 hover:bg-red-500"
            >
              <LogOut />
              End Session
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}