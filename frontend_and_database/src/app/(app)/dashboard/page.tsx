'use client';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { RecentEntriesTable } from '@/components/dashboard/RecentEntriesTable';
import { MoodAnalysisCard } from '@/components/dashboard/MoodAnalysisCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { allEntries, recentEntries, allSessions, moodData, moodTrend } =
    useDashboardData();

  return (
    <div className="space-y-8 font-inter">
      <WelcomeSection />

      <StatsGrid
        totalEntries={allEntries?.length || 0}
        totalSessions={allSessions?.length || 0}
        moodTrend={moodTrend}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentEntriesTable entries={recentEntries} />
        <MoodAnalysisCard moodData={moodData} />
      </div>
    </div>
  );
}