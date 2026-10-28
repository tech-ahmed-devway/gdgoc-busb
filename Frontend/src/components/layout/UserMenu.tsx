import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const roleLabel =
    user.role === 'organizer'
      ? 'Organizer'
      : user.role === 'head'
      ? 'Track Head'
      : 'Vice Head';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors cursor-pointer select-none">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-foreground line-clamp-1">
              {user.fullName}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {roleLabel}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        <div className="px-2 py-1.5 space-y-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{user.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="pt-1 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {user.role === 'organizer' ? (
                <Shield className="w-3 h-3 mr-1 text-[#4285F4]" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
              )}
              {roleLabel}
            </Badge>
            {user.membership?.trackName && (
              <Badge variant="outline" className="text-[10px] font-normal truncate max-w-[180px]">
                {user.membership.trackName}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <UserIcon className="w-4 h-4 mr-2 text-muted-foreground" /> Account Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

