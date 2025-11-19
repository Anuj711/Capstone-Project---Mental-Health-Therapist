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
        description="Your mood has been generally positive"
        icon={<Activity className="h-5 w-5 text-violet-500" />}
      />

      <CTACard />
    </div>
  );
}