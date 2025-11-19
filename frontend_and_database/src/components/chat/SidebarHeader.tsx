import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface SidebarHeaderProps {
  onEndSession: () => void;
}

export function SidebarHeader({ onEndSession }: SidebarHeaderProps) {
  return (
    <>
      <Card className="flex-shrink-0 border-gray-200 mx-2 mb-0">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Avatar className="h-20 w-20 border-4 border-indigo-100">
              <AvatarImage src="/bot.png" alt="AI Therapist" className="object-cover" />
              <AvatarFallback className="bg-textPrimary text-white">
                <Sparkles className="h-10 w-10"/>
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-md font-semibold">Your AI Therapist</CardTitle>
          <CardDescription className="text-sm">Always here to listen and support you</CardDescription>
        </CardHeader>
      </Card>

      <Card className="flex-shrink-0 border-gray-200 mx-2">
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
    </>
  );
}
