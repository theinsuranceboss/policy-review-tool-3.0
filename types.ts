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
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address_street: string | null;
  client_address_city: string | null;
  client_address_state: string | null;
  client_address_zip: string | null;
  policy_carrier: string | null;
  policy_number: string | null;
  policy_lob_type: string | null;
  cross_sell_flags: string[];
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
  uplinkData?: {
    insured_name: string;
    carrier: string;
    premium: string;
    policy_type: string;
    expiration: string;
  };
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