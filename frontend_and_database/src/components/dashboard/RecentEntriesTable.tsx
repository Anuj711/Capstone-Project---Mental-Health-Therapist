import Link from 'next/link';
import { Smile, Frown, Meh, Wind, Activity } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Mood, JournalEntry as JournalEntryType } from '@/lib/definitions';

const MOOD_ICONS: Record<Mood, React.ReactNode> = {
  Happy: <Smile className="h-5 w-5 text-green-500" />,
  Calm: <Wind className="h-5 w-5 text-blue-500" />,
  Neutral: <Meh className="h-5 w-5 text-gray-500" />,
  Sad: <Frown className="h-5 w-5 text-purple-500" />,
  Anxious: <Activity className="h-5 w-5 text-yellow-500" />,
};

interface RecentEntriesTableProps {
  entries: JournalEntryType[];
}

export function RecentEntriesTable({ entries }: RecentEntriesTableProps) {
  return (
    <Card className="lg:col-span-2 shadow-sm">
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle className="text-xl text-gray-700">
            Recent Journal Entries
          </CardTitle>
          <CardDescription>
            A look at your most recent thoughts and feelings.
          </CardDescription>
        </div>
        <Button
          asChild
          size="sm"
          className="ml-auto gap-1 bg-textPrimary hover:bg-textPrimary/90"
        >
          <Link href="/journal" className="text-white">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mood</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries && entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium">
                      {entry.mood ? MOOD_ICONS[entry.mood] : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium line-clamp-1">
                      {entry.content}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {entry.createdAt?.seconds
                      ? formatDistanceToNow(
                          new Date(entry.createdAt.seconds * 1000),
                          {
                            addSuffix: true,
                          }
                        )
                      : 'Just now'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-gray-500"
                >
                  No journal entries yet. Start writing to track your journey!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}