
export interface CoverageLimit {
  label: string;
  limit: string;
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
  // Metadata for AI-extracted leads
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
