'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Smile, Frown, Meh, Wind, Activity } from 'lucide-react';
import { Mood, MOODS } from '@/lib/definitions';
import { cn } from '@/lib/utils';

const MOOD_CONFIG: Record<Mood, { icon: React.ReactNode; color: string; bgColor: string }> = {
  Happy: { 
    icon: <Smile className="h-4 w-4" />, 
    color: 'text-green-600 hover:text-black', 
    bgColor: 'bg-green-100 hover:bg-green-100 border-green-200' 
  },
  Anxious: { 
    icon: <Activity className="h-4 w-4" />, 
    color: 'text-yellow-600 hover:text-black', 
    bgColor: 'bg-yellow-100 hover:bg-yellow-100 border-yellow-200' 
  },
  Calm: { 
    icon: <Wind className="h-4 w-4" />, 
    color: 'text-blue-600 hover:text-black', 
    bgColor: 'bg-blue-100 hover:bg-blue-100 border-blue-200' 
  },
  Sad: { 
    icon: <Frown className="h-4 w-4" />, 
    color: 'text-pink-600 hover:text-black', 
    bgColor: 'bg-pink-100 hover:bg-pink-100 border-pink-200' 
  },
  Neutral: { 
    icon: <Meh className="h-4 w-4" />, 
    color: 'text-gray-600 hover:text-black', 
    bgColor: 'bg-gray-100 hover:bg-gray-100 border-gray-200' 
  },
};

interface JournalFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedMood: Mood | 'All';
  setSelectedMood: (mood: Mood | 'All') => void;
}

export function JournalFilters({ 
  searchQuery, 
  setSearchQuery, 
  selectedMood, 
  setSelectedMood 
}: JournalFiltersProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 rounded-full"
          />
        </div>

        {/* Mood Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedMood === 'All' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMood('All')}
            className={cn(
              'rounded-full',
              selectedMood === 'All' 
                ? 'bg-textPrimary hover:bg-textPrimary/90 text-white border-current font-semibold' 
                : 'border-gray-200'
            )}
          >
            All
          </Button>
          
          {MOODS.map((mood) => {
            const config = MOOD_CONFIG[mood];
            const isSelected = selectedMood === mood;
            
            return (
              <Button
                key={mood}
                variant="outline"
                size="sm"
                onClick={() => setSelectedMood(mood)}
                className={cn(
                  'rounded-full gap-2 border',
                  isSelected 
                    ? `${config.bgColor} ${config.color} border-current font-semibold`
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className={isSelected ? config.color : 'text-gray-600'}>
                  {config.icon}
                </span>
                <span>{mood}</span>
              </Button>
            );
          })}
        </div>

        {/* Sort Dropdown (optional) */}
        
      </div>
    </div>
  );
}