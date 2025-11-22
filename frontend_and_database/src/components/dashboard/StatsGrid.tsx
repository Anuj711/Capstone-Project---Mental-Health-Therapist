import { Activity, ArrowUpRight, BookHeart, MessageSquare } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { CTACard } from './CTACard';

interface StatsGridProps {
  totalEntries: number;
  totalSessions: number;
  moodTrend: string;
}

export function StatsGrid({
  totalEntries,
  totalSessions,
  moodTrend,
}: StatsGridProps) {

  const getMoodDescription = (moodTrend: string) => {
    switch (moodTrend) {
      case 'Positive':
        return 'Your vibe has been terrific lately, we love to see it!'; 
      case 'Negative':
        return 'It\'s been tough lately, but remember you\'re doing your best!';
      case 'Balanced':
        return 'Your emotions have been quite stable recently.';
      default:
        return 'Start journaling to track your mood trends';
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total Entries"
        value={totalEntries}
        description="entries logged all time"
        icon={<BookHeart className="h-5 w-5 text-violet-500" />}
      />

      <StatsCard
        title="Total Sessions"
        value={totalSessions}
        description="chat sessions started"
        icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
      />

      <StatsCard
        title="Mood Trend"
        value={moodTrend}
        description={getMoodDescription(moodTrend)}
        icon={<Activity className="h-5 w-5 text-violet-500" />}
      />

      <CTACard />
    </div>
  );
}