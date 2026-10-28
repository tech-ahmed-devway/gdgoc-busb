export type Role = 'organizer' | 'head' | 'vice_head';

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type WorkflowStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved';

export type SessionMode = 'online' | 'offline';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  membership?: {
    id: string;
    trackId: string;
    trackName: string;
    role: 'head' | 'vice_head';
    status: MembershipStatus;
  } | null;
}

export interface Track {
  id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'archived';
  head?: {
    userId: string;
    fullName: string;
    email: string;
  } | null;
  viceHead?: {
    userId: string;
    fullName: string;
    email: string;
  } | null;
  sessionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Season {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  status: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'head' | 'vice_head';
  trackId: string;
  trackName: string;
  status: MembershipStatus;
  requestedAt: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
}

export interface SessionAsset {
  id: string;
  sessionId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  url?: string;
}

export interface SessionReview {
  id: string;
  sessionId: string;
  reviewerId: string;
  reviewerName?: string;
  action: 'approved' | 'changes_requested' | 'commented';
  comment: string;
  createdAt: string;
}

export interface SessionReport {
  id: string;
  trackId: string;
  trackName?: string;
  seasonId: string;
  seasonName?: string;
  sessionNumber: number;
  title: string;
  content: string;
  startsAt: string;
  endsAt: string;
  mode: SessionMode;
  meetingUrl?: string | null;
  location?: string | null;
  recordingUrl?: string | null;
  attendanceCount: number;
  notes?: string | null;
  learningOutcomes?: string | null;
  challengesFaced?: string | null;
  workflowStatus: WorkflowStatus;
  createdBy: string;
  creatorName?: string;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assets?: SessionAsset[];
  reviews?: SessionReview[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardSummary {
  role: 'organizer' | 'head' | 'vice_head';
  summary: {
    activeTracks?: number;
    activeMembers?: number;
    pendingApprovals?: number;
    totalSessions: number;
    draftSessions?: number;
    drafts?: number;
    submittedSessions?: number;
    submitted?: number;
    changesRequestedSessions?: number;
    changesRequested?: number;
    approvedSessions?: number;
    approved?: number;
    approvedAttendance: number;
  };
  track?: {
    id: string;
    name: string;
    role: string;
  };
  trackOverview?: Array<{
    id: string;
    name: string;
    head: string | null;
    viceHead: string | null;
    totalSessions: number;
    approvedSessions: number;
    pendingReviewSessions: number;
    changesRequestedSessions: number;
    lastSessionDate: string | null;
    completionRate: number;
  }>;
  recentPendingApprovals?: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    trackName: string;
    requestedAt: string;
  }>;
  recentSessionActivities?: Array<{
    id: string;
    sessionNumber: number;
    title: string;
    workflowStatus: WorkflowStatus;
    trackName: string;
    creatorName: string;
    updatedAt: string;
  }>;
  recentSessions?: Array<{
    id: string;
    sessionNumber: number;
    title: string;
    workflowStatus: WorkflowStatus;
    startsAt: string;
    attendanceCount: number;
    updatedAt: string;
  }>;
  resumableDrafts?: Array<{
    id: string;
    sessionNumber: number;
    title: string;
    updatedAt: string;
  }>;
}

export interface ReportsSummary {
  summary: {
    total: number;
    approved: number;
    pending: number;
    changesRequested: number;
    draft: number;
    totalAttendance: number;
  };
  trackBreakdown: Array<{
    trackId: string;
    trackName: string;
    totalSessions: number;
    approvedSessions: number;
    pendingSessions: number;
    attendance: number;
    completionRate: number;
  }>;
}

