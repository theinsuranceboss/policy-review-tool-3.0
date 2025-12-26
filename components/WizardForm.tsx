import React, { useState } from 'react';
import { QuoteRequest } from '../types';

interface WizardFormProps {
  onSubmit: (data: QuoteRequest) => void;
  onCancel: () => void;
}

const INDUSTRIES = [
  "Construction", "Real Estate", "Healthcare", "Professional Services", 
  "Agriculture", "Cyber", "Finance", "Manufacturing", "Legal", "Consulting", 
  "Wholesale & Distribution", "Automotive", "Telecommunications", 
  "Sports & Fitness", "Transportation & Trucking", "Security", 
  "Food Services", "Cleaning", "Retail", "Service & Repair"
];

const CSLB_CLASSES = Array.from({ length: 60 }, (_, i) => `C-${i + 2}`).concat(['A', 'B']);

const WizardForm: React.FC<WizardFormProps> = ({ onSubmit, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<QuoteRequest>>({
    country: 'United States',
    industries: [],
    cslbClasses: [],
    hasActiveCoverage: false,
    knowsPremium: false,
    hasDeclPage: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Logic to determine skip steps
  const showContractorStep = formData.industries?.includes('Construction');
  const showUploadStep = formData.hasDeclPage === true;

  const totalSteps = 8;
  const progress = Math.round((step / totalSteps) * 100);

  const handleNext = () => {
    let nextStep = step + 1;
    if (nextStep === 4 && !showContractorStep) nextStep++;
    if (nextStep === 6 && !showUploadStep) nextStep++;
    setStep(nextStep);
  };

  const handleBack = () => {
    let prevStep = step - 1;
    if (prevStep === 4 && !showContractorStep) prevStep--;
    if (prevStep === 6 && !showUploadStep) prevStep--;
    setStep(prevStep);
  };

  const toggleIndustry = (industry: string) => {
    const current = formData.industries || [];
    setFormData({
      ...formData,
      industries: current.includes(industry) 
        ? current.filter(i => i !== industry) 
        : [...current, industry]
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const finalData: QuoteRequest = {
      ...formData as QuoteRequest,
      id: Math.random().toString(36).substr(2, 9),
      submissionDate: new Date().toLocaleString(),
      status: 'New',
    };
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    onSubmit(finalData);
    setIsSubmitting(false);
    setIsFinished(true);
  };

  if (isFinished) {
    return (
      <div className="glass-card rounded-[3rem] p-16 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tighter">Smart Review Submitted!</h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Your information has been received. Our team is reviewing your inquiry and will reach out shortly.
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-bold hover:bg-yellow-500 transition-all"
        >
          Return to Tool
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 text-left">
      {/* Progress Bar */}
      <div className="sticky top-24 z-40 space-y-2">
        <div className="flex justify-between items-end px-2">
          <span className="text-[10px] font-black tracking-widest text-yellow-400">Step {step} of {totalSteps}</span>
          <span className="text-2xl font-black tracking-tighter">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-yellow-400 transition-all duration-500 shadow-[0_0_15px_rgba(250,204,21,0.3)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] p-8 md:p-12 min-h-[500px] flex flex-col shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
             {/* Dynamic Heading based on step */}
             {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Business Basics</h3>
                <p className="text-gray-400">Fast start - let's identify your business.</p>
              </div>
            )}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Business Location</h3>
                <p className="text-gray-400">Where is your primary base of operations?</p>
              </div>
            )}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Business Type</h3>
                <p className="text-gray-400">Select all that apply to your operations.</p>
              </div>
            )}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Contractor License</h3>
                <p className="text-gray-400">Please select your CSLB License Class Codes.</p>
              </div>
            )}
            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Existing Coverage</h3>
                <p className="text-gray-400">Tell us about your current insurance status.</p>
              </div>
            )}
            {step === 6 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Document Upload</h3>
                <p className="text-gray-400">Uploading your Dec Page allows for a much deeper analysis.</p>
              </div>
            )}
            {step === 7 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Contact Details</h3>
                <p className="text-gray-400">Final stretch! How should we reach you?</p>
              </div>
            )}
            {step === 8 && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="text-3xl font-black mb-2 tracking-tighter">Final Review</h3>
                <p className="text-gray-400">Almost a Boss. Confirm your details.</p>
              </div>
            )}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-1 gap-6">
              <Input label="Business Legal Name" required value={formData.businessName} onChange={v => setFormData({...formData, businessName: v})} />
              <Input label="DBA (Doing Business As)" value={formData.dba} onChange={v => setFormData({...formData, dba: v})} />
              <div className="grid grid-cols-2 gap-6">
                <Input label="FEIN / EIN" required value={formData.fein} onChange={v => setFormData({...formData, fein: v})} />
                <Input label="Years in Business" type="number" required value={formData.yearsInBusiness} onChange={v => setFormData({...formData, yearsInBusiness: v})} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-6">
              <Input label="Address Line 1" required value={formData.address1} onChange={v => setFormData({...formData, address1: v})} />
              <Input label="Address Line 2 (Optional)" value={formData.address2} onChange={v => setFormData({...formData, dba: v})} />
              <div className="grid grid-cols-2 gap-6">
                <Input label="City" required value={formData.city} onChange={v => setFormData({...formData, city: v})} />
                <Input label="State" required value={formData.state} onChange={v => setFormData({...formData, state: v})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Input label="Zip Code" required value={formData.zip} onChange={v => setFormData({...formData, zip: v})} />
                <Input label="Country" value={formData.country} disabled />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  className={`px-4 py-3 rounded-xl border text-left text-xs font-bold transition-all ${
                    formData.industries?.includes(ind) 
                      ? 'bg-yellow-400 border-yellow-400 text-black scale-[1.02]' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {CSLB_CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => {
                    const current = formData.cslbClasses || [];
                    setFormData({
                      ...formData,
                      cslbClasses: current.includes(cls) ? current.filter(c => c !== cls) : [...current, cls]
                    });
                  }}
                  className={`py-3 rounded-lg border text-xs font-black transition-all ${
                    formData.cslbClasses?.includes(cls) 
                      ? 'bg-yellow-400 border-yellow-400 text-black' 
                      : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-4">
              <ToggleRow label="Do you currently have active coverage?" value={!!formData.hasActiveCoverage} onChange={v => setFormData({...formData, hasActiveCoverage: v})} />
              <ToggleRow label="Do you know your current annual premium?" value={!!formData.knowsPremium} onChange={v => setFormData({...formData, knowsPremium: v})} />
              <ToggleRow label="Do you have access to your Declarations Page?" value={!!formData.hasDeclPage} onChange={v => setFormData({...formData, hasDeclPage: v})} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="border-2 border-dashed border-white/10 rounded-3xl p-16 text-center space-y-4 hover:border-yellow-400 transition-colors cursor-pointer bg-white/5">
              <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto text-yellow-400">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <div>
                <p className="font-bold text-xl">{formData.hasDeclPage ? 'Policy_Document_Upload.pdf' : 'Upload Declarations Page'}</p>
                <p className="text-gray-500 text-sm">PDF, JPG, or PNG (Max 15MB)</p>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-6">
              <Input label="Contact Name" required value={formData.contactName} onChange={v => setFormData({...formData, contactName: v})} />
              <Input label="Email Address" type="email" required value={formData.contactEmail} onChange={v => setFormData({...formData, contactEmail: v})} />
              <Input label="Phone Number" type="tel" required value={formData.contactPhone} onChange={v => setFormData({...formData, contactPhone: v})} />
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-left">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-sm space-y-4 leading-relaxed text-gray-400">
               <p>This submission does not replace your current broker.</p>
               <p>The Insurance Boss provides an independent coverage review to identify gaps, savings, and better market positioning.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-500 tracking-widest">Business</p>
                <p className="font-bold text-white">{formData.businessName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-500 tracking-widest">Contact</p>
                <p className="font-bold text-white">{formData.contactName}</p>
              </div>
            </div>
            {formData.industries && formData.industries.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-500 tracking-widest">Industries</p>
                <p className="text-sm text-gray-300">{formData.industries.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-10 flex gap-4">
          {step > 1 && (
            <button 
              onClick={handleBack}
              className="px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold"
            >
              Back
            </button>
          )}
          <button 
            disabled={isSubmitting}
            onClick={step === totalSteps ? handleFinalSubmit : handleNext}
            className="flex-1 bg-yellow-400 text-black py-4 rounded-2xl font-black tracking-wider hover:bg-yellow-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {isSubmitting ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <>{step === totalSteps ? 'Get My Insurance Review' : 'Continue'}</>
            )}
          </button>
        </div>
      </div>
      
      <button 
        onClick={onCancel}
        className="w-full text-center text-gray-500 text-xs hover:text-white transition-colors tracking-widest"
      >
        Cancel Submission
      </button>
    </div>
  );
};

const Input: React.FC<{ label: string; required?: boolean; type?: string; value?: string; disabled?: boolean; onChange?: (v: string) => void }> = ({ label, required, type = 'text', value, disabled, onChange }) => (
  <div className="space-y-1.5 group">
    <label className="text-[10px] font-black text-gray-500 tracking-widest group-focus-within:text-yellow-400 transition-colors">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input 
      type={type}
      value={value || ''}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-yellow-400 transition-all text-sm font-medium disabled:opacity-50"
      placeholder="..."
    />
  </div>
);

const ToggleRow: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
    <span className="font-bold text-gray-300">{label}</span>
    <div className="flex gap-2">
      <button 
        onClick={() => onChange(true)}
        className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${value ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
      >
        Yes
      </button>
      <button 
        onClick={() => onChange(false)}
        className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${!value ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
      >
        No
      </button>
    </div>
  </div>
);

export default WizardForm;