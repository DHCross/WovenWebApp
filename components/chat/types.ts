import { SSTTag } from '../../lib/raven/sst';

export interface ValidationPoint {
  id: string;
  field: string;
  text: string;
  tag?: SSTTag;
  note?: string;
}

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
  validationPoints?: ValidationPoint[];
  validationComplete?: boolean;
}
