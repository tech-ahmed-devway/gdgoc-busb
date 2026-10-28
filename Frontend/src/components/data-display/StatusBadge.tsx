import React from 'react';
import { Badge } from '@/components/ui/badge';
import { WorkflowStatus, AccountStatus } from '@/types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

interface StatusBadgeProps {
  status: WorkflowStatus | AccountStatus | 'active' | 'archived' | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved
        </Badge>
      );
    case 'submitted':
    case 'under_review':
      return (
        <Badge variant="warning" className={className}>
          <Clock className="w-3.5 h-3.5 mr-1" /> Awaiting Review
        </Badge>
      );
    case 'changes_requested':
      return (
        <Badge variant="destructive" className={className}>
          <AlertCircle className="w-3.5 h-3.5 mr-1" /> Changes Requested
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="secondary" className={className}>
          <FileEdit className="w-3.5 h-3.5 mr-1" /> Draft
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="warning" className={className}>
          <Clock className="w-3.5 h-3.5 mr-1" /> Pending Approval
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="w-3.5 h-3.5 mr-1" /> Rejected
        </Badge>
      );
    case 'active':
      return (
        <Badge variant="success" className={className}>
          Active
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="neutral" className={className}>
          Archived
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}

