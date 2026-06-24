// Family AI Assistant — client-side reference data.
//
// Live domain data (documents, communications, tasks, members) comes from the
// backend via the api/ proxy + Supabase. This file holds only the small,
// presentation-level lookups the UI still needs locally:
//   • FAMILY_MEMBERS — owner-name → display (color, avatar, initials) for the
//     real Pacheco Pedro family, mirroring supabase migration 0005.
//   • DEFAULT_RENEWAL_PLANS — illustrative renewal steps keyed by document
//     title, shown on the document detail screen.
// Keep member names/colors in sync with 0005_real_family_seed.sql.

// ==========================================
// TYPES
// ==========================================

export type MemberKey = 'Diogo' | 'Alana' | 'Bella' | 'Noah' | 'Ayla' | 'Family';

export interface FamilyMember {
  name: string;
  role: string;
  avatar: string;
  color: string; // hex tint
  initials: string;
}

export interface FamilyDocument {
  id: string;
  name: string;
  number: string;
  expiryDate: string; // YYYY-MM-DD
  owner: string; // family member name (live), or "Family" if shared
  category: string;
  progress: number; // 0-100 renewal progress
}

export interface RenewalStep {
  title: string;
  details: string;
  fee: string;
  location: string;
}

// ==========================================
// CONSTANTS
// ==========================================

// Fixed "now" for deterministic expiry/urgency math in the POC.
export const REFERENCE_DATE = '2026-05-19';

// Real family roster — colors/avatars match migration 0005_real_family_seed.sql.
export const FAMILY_MEMBERS: Record<MemberKey, FamilyMember> = {
  Diogo: { name: 'Diogo', role: 'Parent 1', avatar: '👨‍💻', color: '#6366f1', initials: 'D' },
  Alana: { name: 'Alana', role: 'Parent 2', avatar: '👩', color: '#f43f5e', initials: 'A' },
  Bella: { name: 'Bella', role: 'Child · Year 5', avatar: '👧', color: '#f59e0b', initials: 'B' },
  Noah: { name: 'Noah', role: 'Child · Year 2', avatar: '👦', color: '#10b981', initials: 'N' },
  Ayla: { name: 'Ayla', role: 'Child · Reception', avatar: '👶', color: '#a855f7', initials: 'A' },
  Family: { name: 'Family', role: 'Household', avatar: '🏡', color: '#14b8a6', initials: 'F' },
};

// Illustrative, UK-context renewal walkthroughs. Keyed by document title so they
// match the backend document titles (see migration 0005). Documents without a
// matching plan simply show no steps.
export const DEFAULT_RENEWAL_PLANS: Record<string, RenewalStep[]> = {
  Passport: [
    { title: 'Start HM Passport Office application', details: 'Apply online via GOV.UK. Complete the renewal form and upload the applicant details. Renew early — overseas/peak renewals can take several weeks.', fee: '£88.50 (online)', location: 'GOV.UK Passport Service' },
    { title: 'Submit a compliant digital photo', details: 'Use a recent, plain-background photo that meets the GOV.UK photo standards, or upload a studio digital photo code.', fee: '~£10', location: 'Photo studio / app' },
    { title: 'Send your old passport', details: 'Post the current passport securely to HMPO using the supplied tracked return envelope.', fee: 'Included', location: 'Royal Mail Tracked' },
    { title: 'Receive the new passport', details: 'HMPO prints and returns the new biometric passport. Your cancelled old passport is returned separately.', fee: 'Included', location: 'Tracked delivery' },
  ],
  'Driving Licence': [
    { title: 'Renew on the DVLA portal', details: 'Sign in to GOV.UK / DVLA, confirm your details and current address, and submit the photocard renewal.', fee: '£14 (online)', location: 'GOV.UK / DVLA' },
    { title: 'Confirm or update your photo', details: 'Reuse your passport photo where eligible, or upload a new compliant image.', fee: 'Free', location: 'DVLA online' },
    { title: 'Receive the photocard', details: 'The new photocard licence is posted to your registered address, usually within a week.', fee: 'Included', location: 'Royal Mail' },
  ],
  'School ID': [
    { title: 'Open the parent portal', details: 'Log in to the Oakwood Primary parent portal and go to the student profile section.', fee: 'Free', location: 'Oakwood Portal' },
    { title: 'Upload a new student photo', details: 'Upload a recent, front-facing photo in uniform against a plain background.', fee: 'Free', location: 'Portal upload' },
    { title: 'Settle the printing fee', details: 'Pay the small card reprint fee through the portal checkout.', fee: '£5', location: 'School payment portal' },
    { title: 'Collect from the office', details: 'New ID cards are issued via the class teacher or the front office.', fee: 'Free', location: 'Oakwood front office' },
  ],
  'Health Insurance': [
    { title: 'Request renewal quotes', details: 'Contact ShieldHealth or log in to the member portal to receive renewal options and updated coverage schedules.', fee: 'Free', location: 'ShieldHealth Portal' },
    { title: 'Review the medical declarations', details: 'Check and confirm the family medical declarations and any pre-existing condition notes.', fee: 'Free', location: 'Online sign tool' },
    { title: 'Approve and pay the premium', details: 'Authorise the premium payment before the renewal date to avoid any lapse in cover.', fee: 'Custom', location: 'Payment portal' },
    { title: 'Download the new cards', details: 'Digital member cards refresh instantly — sync them to the app and your wallet.', fee: 'Free', location: 'ShieldHealth app' },
  ],
  'Car Insurance': [
    { title: 'Compare the renewal quote', details: 'Review the insurer renewal quote against the market before it auto-renews.', fee: 'Free', location: 'Insurer portal' },
    { title: 'Confirm cover and pay', details: 'Confirm comprehensive cover and named drivers, then settle the premium.', fee: '£480 / yr', location: 'Payment gateway' },
    { title: 'Save the certificate', details: 'Download the new certificate of motor insurance and store it with the vehicle documents.', fee: 'Included', location: 'Insurer app' },
  ],
  'Home Contents Insurance': [
    { title: 'Update the contents valuation', details: 'Re-estimate the value of furniture, electronics and high-value items before renewing.', fee: 'Free', location: 'Insurer portal' },
    { title: 'Renew the policy', details: 'Confirm the cover level and pay the annual premium online.', fee: '£190 / yr', location: 'Payment gateway' },
  ],
};
