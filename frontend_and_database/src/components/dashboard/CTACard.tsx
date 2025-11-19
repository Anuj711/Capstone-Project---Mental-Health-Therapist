
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CTACard() {
  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          Ready to Journal?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-600 mb-3">
          Take a moment to reflect on your day
        </p>
        <Button
          size="lg"
          className="w-full bg-textPrimary hover:bg-textPrimary/90"
          asChild
        >
          <Link href="/journal" className="text-white">
            + New Entry
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
