import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left side: Mobile Menu Trigger + Brand on mobile */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden h-10 w-10 text-muted-foreground hover:text-foreground"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile brand logo text */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex items-center -space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
            <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
            <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
            <span className="w-2 h-2 rounded-full bg-[#34A853]" />
          </div>
          <span className="font-bold text-sm text-foreground">
            GDGoC <span className="text-[#4285F4]">BUSB</span>
          </span>
        </div>
      </div>

      {/* Right side: Actions, Theme Toggle & User Menu */}
      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        <div className="h-5 w-px bg-border mx-1" />
        <UserMenu />
      </div>
    </header>
  );
}

