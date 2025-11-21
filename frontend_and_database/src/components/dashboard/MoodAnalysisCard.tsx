import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MoodChart } from '@/components/dashboard/mood-chart';
import { MoodDataItem } from '@/lib/definitions';

interface MoodAnalysisCardProps {
  moodData: MoodDataItem[];
}

export function MoodAnalysisCard({ moodData }: MoodAnalysisCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-gray-700">Mood Analysis</CardTitle>
        <CardDescription className="text-xs">
          A summary of your logged moods over time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MoodChart moodData={moodData} />
      </CardContent>
    </Card>
  );
}
