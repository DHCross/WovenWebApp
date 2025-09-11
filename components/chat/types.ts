export interface Message { 
  id: string; 
  role: 'user' | 'raven'; 
  html: string; 
  climate?: string; 
  hook?: string;
  isReport?: boolean;
  reportType?: 'mirror' | 'balance' | 'journal';
  reportName?: string;
  reportSummary?: string;
  collapsed?: boolean;
  fullContent?: string;
}
