import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  CalendarCheck,
  UserCheck,
  Compass,
  Layers,
  FileSpreadsheet,
  History,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 select-none z-30 sticky top-0 h-screen',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center -space-x-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-foreground whitespace-nowrap">
                GDGoC <span className="text-[#4285F4]">BUSB</span>
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                Chapter Management
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex items-center -space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
            <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
            <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
            <span className="w-2 h-2 rounded-full bg-[#34A853]" />
          </div>
        )}

        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems
          .filter((item) => item.allowed)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <Icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-110')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
      </div>

      {/* Track info card for Head / Vice Head */}
      {!collapsed && !isOrganizer && user?.membership?.trackName && (
        <div className="p-3 m-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
            Assigned Track
          </p>
          <p className="text-xs font-medium text-foreground line-clamp-1">
            {user.membership.trackName}
          </p>
          <span className="text-[10px] text-muted-foreground capitalize">
            {user.membership.role.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Chapter Organizer Badge */}
      {!collapsed && isOrganizer && (
        <div className="p-3 m-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4285F4]">
            <Shield className="w-3.5 h-3.5" /> Chapter Admin
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Full permissions active
          </p>
        </div>
      )}
    </aside>
  );
}

