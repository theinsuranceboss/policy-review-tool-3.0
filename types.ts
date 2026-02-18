export interface CoverageLimit {
  label: string;
  limit: string;
}

export interface PremiumUser {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface PremiumRequest {
  id: string;
  username: string;
  password: string;
  email: string;
  requestDate: string;
}

export interface EZLynxPayload {
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_street: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip: string | null;
  carrier_name: string | null;
  current_premium: string | null;
  policy_type: string | null;
  expiration_date: string | null;
}

export interface PolicyAnalysis {
  id: string;
  filename: string;
  uploadDate: string;
  type: string;
  rating: 'Good' | 'Needs Improvement' | 'Poor' | 'Unable to Analyze';
  score: number; // 0 to 10
  insuredName: string;
  insuredAddress: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  fein?: string;
  carrierName?: string;
  premiumAmount?: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  coverageLimits: CoverageLimit[];
  summary: string;
  coverageAnalysis: string;
  premiumVsValue: string;
  exclusions: string;
  foundExclusions: string[]; 
  industryExclusionAudit: string;
  deductibles: string;
  strengths: string[];
  redFlags: string[];
  recommendations: string[];
  fileData?: string; 
  fileHash?: string;
  uplinkData?: EZLynxPayload;
  ezlynxData?: EZLynxPayload;
}

export interface QuoteRequest {
  id: string;
  submissionDate: string;
  status: 'New' | 'In Review' | 'Quoted' | 'Closed';
  businessName: string;
  dba?: string;
  fein: string;
  yearsInBusiness: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  industries: string[];
  cslbClasses?: string[];
  hasActiveCoverage: boolean;
  knowsPremium: boolean;
  hasDeclPage: boolean;
  declPageFile?: string; 
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  verificationToken?: string;
  isVerified?: boolean;
  extractedCoverage?: string;
  sourcePolicyId?: string;
}

export interface AdminStats {
  totalPolicies: number;
  totalLeads: number;
  reviewed: number;
  goodPolicies: number;
  needsImprovement: number;
  needsReview: number;
}