// Newsletter Analytics types

export interface NewsletterAnalytics {
  id: string;
  newsletterId: string;
  totalRecipients: number;
  totalOpens: number;
  uniqueOpens: number;
  pixelToken: string;
  createdAt: Date;
}

export interface NewsletterLinkClick {
  id: string;
  analyticsId: string;
  url: string;
  linkType: 'appointment' | 'statusreport';
  linkId: string | null;
  clickCount: number;
  uniqueClicks: number;
  firstClick: Date | null;
  lastClick: Date | null;
}


export interface NewsletterFingerprint {
  id: string;
  analyticsId: string;
  fingerprint: string;
  openCount: number;
  firstOpenAt: Date;
  lastOpenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface NewsletterAnalyticsResponse {
  analytics: NewsletterAnalytics;
  newsletter: {
    id: string;
    subject: string;
    sentAt: Date | null;
  };
  openRate: number;
  uniqueOpenRate: number;
  repeatOpenRate: number;
  linkPerformance: LinkPerformanceData[];
  engagementMetrics: {
    totalOpens: number;
    uniqueOpens: number;
    repeatOpens: number;
    averageOpensPerRecipient: number;
    totalLinkClicks: number;
    uniqueLinkClicks: number;
  };
}

export interface NewsletterAnalyticsDashboardResponse {
  recentNewsletters: {
    id: string;
    subject: string;
    sentAt: Date | null;
    recipientCount: number | null;
    openRate: number;
    clickCount: number;
  }[];
  overallMetrics: {
    totalNewsletters: number;
    averageOpenRate: number;
    totalClicks: number;
  };
}

// Chart data types
export interface OpenTimelineData {
  hour: number;
  opens: number;
  cumulative: number;
}

export interface LinkPerformanceData {
  url: string;
  linkType: string;
  linkId: string | null;
  totalClicks: number;
  uniqueClicks: number;
  uniqueClickRate: number;
  firstClick: Date | null;
  lastClick: Date | null;
}

// Component prop types
export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}


export interface LinkPerformanceTableProps {
  data: LinkPerformanceData[];
}

export interface NewsletterAnalyticsButtonProps {
  newsletterId: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}