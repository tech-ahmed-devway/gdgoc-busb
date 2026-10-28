import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  accentColor?: 'blue' | 'red' | 'yellow' | 'green' | 'gray';
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  accentColor = 'blue',
  className,
}: StatsCardProps) {
  const colorMap = {
    blue: 'border-l-4 border-l-[#4285F4] bg-blue-500/5 text-[#4285F4]',
    red: 'border-l-4 border-l-[#EA4335] bg-red-500/5 text-[#EA4335]',
    yellow: 'border-l-4 border-l-[#FBBC04] bg-amber-500/5 text-amber-500',
    green: 'border-l-4 border-l-[#34A853] bg-emerald-500/5 text-[#34A853]',
    gray: 'border-l-4 border-l-muted-foreground bg-muted/20 text-muted-foreground',
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs md:text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl flex items-center justify-center', colorMap[accentColor])}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

