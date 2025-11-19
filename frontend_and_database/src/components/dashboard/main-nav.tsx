'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Menu
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const routes = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/journal',
      label: 'Journal',
      icon: BookOpen,
      active: pathname === '/journal' || pathname?.startsWith('/journal/'),
    },
    {
      href: '/chat',
      label: 'Chat',
      icon: MessageSquare,
      active: pathname === '/chat' || pathname?.startsWith('/chat/'),
    },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {routes.map((route) => {
          const Icon = route.icon;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors hover:text-indigo-600 relative group',
                route.active
                  ? 'text-indigo-600 font-semibold'
                  : 'text-gray-600'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{route.label}</span>
              {route.active && (
                <span className="absolute -bottom-6 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64">
          <nav className="flex flex-col gap-4 mt-8">
            {routes.map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 text-sm font-medium transition-colors hover:text-indigo-600 py-2 px-3 rounded-lg',
                    route.active
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-gray-600'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{route.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}