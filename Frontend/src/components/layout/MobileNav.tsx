import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  CalendarCheck,
  UserCheck,
  Compass,
  Layers,
  FileSpreadsheet,
  History,
  Shield,
  Sparkles,
} from 'lucide-react';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const { user, isOrganizer } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      label: 'Session Reports',
      path: '/sessions',
      icon: CalendarCheck,
      allowed: true,
    },
    {
      label: 'Approval Queue',
      path: '/approvals',
      icon: UserCheck,
      allowed: isOrganizer,
    },
    {
      label: 'Tracks Management',
      path: '/tracks',
      icon: Compass,
      allowed: isOrganizer,
    },
    {
      label: 'Seasons',
      path: '/seasons',
      icon: Layers,
      allowed: isOrganizer,
    },
    {
      label: 'Reports & Export',
      path: '/reports',
      icon: FileSpreadsheet,
      allowed: isOrganizer,
    },
    {
      label: 'Audit History',
      path: '/audit',
      icon: History,
      allowed: isOrganizer,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-xs p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border text-left">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
            </div>
            <SheetTitle className="text-base font-bold text-foreground">
              GDGoC <span className="text-[#4285F4]">BUSB</span>
            </SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Chapter Management System
          </p>
        </SheetHeader>

        {/* Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems
            .filter((item) => item.allowed)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onOpenChange(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </div>

        {/* User Info footer */}
        {user && (
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-xs font-semibold text-foreground truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user.email}
            </p>
            {user.membership?.trackName && (
              <p className="text-[10px] text-primary mt-1 font-medium">
                Track: {user.membership.trackName}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

