// Family AI Assistant — demo data (mock). Backend deferred; the app runs
// fully on this seed data until Supabase + the api/ proxy are wired in.

// ==========================================
// TYPES
// ==========================================

export type MemberKey = 'Ahmed' | 'Sara' | 'Yusuf' | 'Layla' | 'Family';

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
  owner: string; // family member name (see store/members)
  category: string;
  progress: number; // 0-100 renewal progress
}

export interface FamilyEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  icon: string;
  category: string;
  body: string;
  read: boolean;
}

export interface ActionItem {
  action: string;
  owner: string;
  deadline: string;
}

export interface Deadline {
  item: string;
  date: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface AiAnalysis {
  events: { date: string; description: string }[];
  actionItems: ActionItem[];
  documentsNeeded: string[];
  deadlines: Deadline[];
  needsReply: boolean;
  draftReply: string | null;
  summary: string;
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

export const FAMILY_MEMBERS: Record<MemberKey, FamilyMember> = {
  Ahmed: { name: 'Ahmed', role: 'Parent 1', avatar: '👨‍💼', color: '#6366f1', initials: 'A' },
  Sara: { name: 'Sara', role: 'Parent 2', avatar: '👩‍⚕️', color: '#f43f5e', initials: 'S' },
  Yusuf: { name: 'Yusuf', role: 'Child 1 (9)', avatar: '👦', color: '#f59e0b', initials: 'Y' },
  Layla: { name: 'Layla', role: 'Child 2 (6)', avatar: '👧', color: '#10b981', initials: 'L' },
  Family: { name: 'Family', role: 'Household', avatar: '🏡', color: '#14b8a6', initials: 'F' },
};

export const INITIAL_DOCUMENTS: FamilyDocument[] = [
  { id: 'doc-1', name: 'UAE Passport', number: 'N1234567', expiryDate: '2024-11-15', owner: 'Ahmed', category: 'Identity', progress: 0 },
  { id: 'doc-2', name: 'UAE Driving Licence', number: 'DL-99887', expiryDate: '2026-07-01', owner: 'Ahmed', category: 'Driving', progress: 85 },
  { id: 'doc-3', name: 'UAE Passport', number: 'N7654321', expiryDate: '2027-09-20', owner: 'Sara', category: 'Identity', progress: 100 },
  { id: 'doc-4', name: 'UK Passport', number: 'GB-887766', expiryDate: '2025-06-10', owner: 'Sara', category: 'Identity', progress: 0 },
  { id: 'doc-5', name: 'UAE Passport', number: 'N2468101', expiryDate: '2026-08-05', owner: 'Yusuf', category: 'Identity', progress: 75 },
  { id: 'doc-6', name: 'School ID', number: 'SCH-998', expiryDate: '2026-06-30', owner: 'Yusuf', category: 'Education', progress: 65 },
  { id: 'doc-7', name: 'UAE Passport', number: 'N1357911', expiryDate: '2027-03-12', owner: 'Layla', category: 'Identity', progress: 100 },
  { id: 'doc-8', name: 'Health Insurance Card', number: 'CIG-8833', expiryDate: '2025-05-31', owner: 'Layla', category: 'Health', progress: 0 },
  { id: 'doc-9', name: 'Home Contents Insurance', number: 'HC-9922', expiryDate: '2026-07-15', owner: 'Family', category: 'Finance', progress: 80 },
  { id: 'doc-10', name: 'Car Insurance', number: 'CI-3344', expiryDate: '2026-07-22', owner: 'Family', category: 'Driving', progress: 82 },
];

export const INITIAL_EMAILS: FamilyEmail[] = [
  { id: 'email-1', from: 'Greenwood International School <admin@greenwood.sch.ae>', subject: 'Weekly Newsletter: Parent-Teacher Meetings & Book Fair Deadline', date: '2026-05-18', icon: '🏫', category: 'Education', read: false, body: 'Dear Parents,\n\nPlease note that the Parent-Teacher meetings are scheduled for next Tuesday, May 26. Individual slots must be booked via the portal.\n\nAlso, the deadline to register for the annual Book Fair and submit reading selections is this Friday, May 22.\n\nFinally, the consent and permission slip for the Year 4 field trip must be returned signed by Friday afternoon.\n\nBest regards,\nGreenwood Admin' },
  { id: 'email-2', from: 'AllStars Football Academy <coach.marcus@allstars.ae>', subject: 'Training Schedule Change & Tournament Registration', date: '2026-05-17', icon: '⚽', category: 'Sports', read: false, body: 'Hello families,\n\nPlease note training this Saturday (May 23) is moved to 8:00 AM due to the forecasted heat. Please ensure the kids bring plenty of water.\n\nAlso, registration for the Summer Cup tournament closes in exactly 5 days (May 22). Please complete the kit order form at your earliest convenience to secure the new jerseys.\n\nBest,\nCoach Marcus' },
  { id: 'email-3', from: "King's College Hospital Clinic <pediatrics@kingsclinic.ae>", subject: 'Annual Pediatric Health Check Reminder', date: '2026-05-19', icon: '🩺', category: 'Health', read: false, body: 'Dear Sara,\n\nThis is a reminder that Yusuf and Layla are due for their annual pediatric health check. Keeping up with annual checks is important for their school health records.\n\nPlease use the link below to book their slots for next week. Remember to bring your valid health insurance card and Emirates ID to the appointment.\n\nWarm regards,\nPediatric Team' },
  { id: 'email-4', from: 'Emirates Airlines <booking@emirates.com>', subject: 'Flight Confirmation: Dubai to London Heathrow', date: '2026-05-15', icon: '✈️', category: 'Travel', read: true, body: "Thank you for booking with Emirates.\n\nYour flight EK007 from DXB to LHR is confirmed for July 5, 2026 (in 47 days). Departure is at 09:40 AM.\n\nPlease ensure you update your passport details in the manage booking portal at least 7 days before departure. Note that Sara's British passport must be valid for travel." },
  { id: 'email-5', from: 'Cigna Global Health <renewals@cigna.com>', subject: 'URGENT: Family Health Insurance Renewal Notice', date: '2026-05-19', icon: '🛡️', category: 'Insurance', read: false, body: 'Dear Ahmed,\n\nYour family health insurance policy (Policy #CG-998877) will renew in exactly 30 days on June 18, 2026.\n\nAction is required to confirm your current plan benefits or switch plans before the automatic renewal date. Failure to respond may lead to a temporary gap in coverage or premium increase.\n\nSincerely,\nCigna Renewals Team' },
  { id: 'email-6', from: 'Greenwood Accounts Office <finance@greenwood.sch.ae>', subject: 'Term 3 Tuition Fees Invoice - Due in 14 Days', date: '2026-05-18', icon: '💵', category: 'Finance', read: false, body: 'Dear Parents,\n\nThe Term 3 tuition fees invoice has been generated.\n\nThe total amount due is AED 24,500, payable by June 2, 2026 (in 14 days). Please use our online payment portal to settle this invoice. A 5% late fee applies to payments received after the deadline.\n\nGreenwood Finance' },
  { id: 'email-7', from: 'GDRFA Dubai <no-reply@gdrfad.gov.ae>', subject: 'Residency Visa Renewal Appointment Confirmed', date: '2026-05-19', icon: '🛂', category: 'Admin', read: false, body: 'Dear Ahmed,\n\nYour residency visa renewal biometrics appointment is confirmed for May 24, 2026, at 9:00 AM at the Al Manara Centre.\n\nPlease bring:\n1) Original Passport\n2) 4 passport-sized photos with white background\n3) Signed NOC letter from your sponsor\n\nThank you,\nGDRFA Support' },
  { id: 'email-8', from: 'Dubai Active Summer Camps <info@dubaiactive.com>', subject: 'Summer Camp Registration Opens Monday!', date: '2026-05-16', icon: '🏕️', category: 'Activities', read: true, body: 'Get ready for summer!\n\nSummer Camp registration opens next Monday, May 25. Our early bird discount (15% off) ends in 10 days on May 29.\n\nSpaces are strictly limited and will be allocated on a first-come, first-served basis. Sign up today to guarantee their places!\n\nWarmly,\nDubai Active Team' },
  { id: 'email-9', from: 'Pearl Dental Clinic Dubai <reception@pearldental.ae>', subject: '6-Month Dental Checkup Overdue Notice', date: '2026-05-12', icon: '🦷', category: 'Health', read: true, body: "Hi Sara,\n\nOur records show that the routine 6-month dental cleaning and checkup are now overdue. Regular checks help prevent cavities!\n\nPlease call our reception desk at 04-333-2211 to book an appointment this week.\n\nBest,\nPearl Dental Clinic" },
  { id: 'email-10', from: 'Greenwood Year 4 Coordinator <y4trip@greenwood.sch.ae>', subject: 'Year 4 Adventure Camp - Consent and Payment Due Next Wednesday', date: '2026-05-17', icon: '⛺', category: 'Education', read: false, body: 'Hi Parents,\n\nDetails for the Year 4 overnight trip to Hatta are attached. The total cost is AED 250 and is due by next Wednesday, May 27.\n\nPlease submit the signed physical consent form and the completed medical conditions questionnaire to the class teacher.\n\nThanks,\nMs. Henderson' },
  { id: 'email-11', from: 'AXA Gulf Insurance <quotes@axagulf.ae>', subject: 'Car Insurance Renewal Quote - Policy #AX-4433', date: '2026-05-18', icon: '🚗', category: 'Insurance', read: false, body: 'Dear Ahmed,\n\nYour comprehensive car insurance policy for your SUV will expire on June 15, 2026.\n\nYour renewal quote is attached with a 20% premium adjustment due to market rates. Please respond within 7 days (by May 25) to lock in this rate and avoid a lapse of registration.\n\nBest regards,\nAXA Team' },
  { id: 'email-12', from: 'Hamilton Aquatics Dubai <lessons@hamiltonaquatics.ae>', subject: 'Swimming Lesson Level Assessment - Saturday May 23', date: '2026-05-19', icon: '🏊', category: 'Sports', read: false, body: "Hi Sara,\n\nYusuf's swimming level assessment is scheduled for this coming Saturday, May 23, at 10:30 AM at the Hamdan Sports Complex.\n\nPlease ensure he arrives 15 minutes early and brings his goggles, swim cap, and dry towel.\n\nRegards,\nHamilton Coaching Team" },
  { id: 'email-13', from: 'Tiny Tots Nursery Dubai <accounts@tinytots.ae>', subject: 'Monthly Nursery Fees Invoice - June 2026', date: '2026-05-19', icon: '🧸', category: 'Finance', read: true, body: "Dear Parents,\n\nThe monthly tuition invoice for Layla's morning nursery sessions for June 2026 is AED 3,200.\n\nPayment is due in full by June 1, 2026. Please transfer to the bank details enclosed in the attached invoice PDF.\n\nWarm regards,\nTiny Tots Finance" },
  { id: 'email-14', from: 'British Embassy Dubai <consular.dubai@fcdo.gov.uk>', subject: 'Important consular update: UK Passport renewal times', date: '2026-05-10', icon: '🇬🇧', category: 'Admin', read: true, body: 'Dear British Citizens,\n\nPlease be advised that the current processing time for UK passport renewals submitted from overseas is now running at 8 to 10 weeks due to seasonal demand.\n\nWe strongly advise applying early for summer travel. Do not book travel until you have your new passport.\n\nBritish Consular Services' },
  { id: 'email-15', from: 'Greenwood Portal <notifications@greenwood.portal.ae>', subject: 'New message from Class Teacher Ms. Henderson', date: '2026-05-19', icon: '📝', category: 'Education', read: false, body: 'Notification:\n\nA new message has been posted on the Greenwood Parent Portal.\n\nMs. Henderson has requested all parents of Year 4 students to verify and submit the English reading homework log by this Thursday, May 21.\n\nGreenwood Portal' },
];

export const MOCK_AI_RESPONSES: Record<string, AiAnalysis> = {
  'email-1': { events: [{ date: '2026-05-26', description: 'Parent-Teacher Meetings' }], actionItems: [{ action: 'Book Parent-Teacher meeting slot in school portal', owner: 'Both', deadline: '2026-05-25' }, { action: 'Register for annual Book Fair and submit reading selections', owner: 'Sara', deadline: '2026-05-22' }, { action: 'Return signed Year 4 trip permission consent slip', owner: 'Ahmed', deadline: '2026-05-22' }], documentsNeeded: ['Consent Slip (signed)'], deadlines: [{ item: 'Field trip consent due', date: '2026-05-22', urgency: 'high' }, { item: 'Book Fair registry due', date: '2026-05-22', urgency: 'high' }], needsReply: false, draftReply: null, summary: 'Book Parent-Teacher meeting slots, submit Book Fair registry, and return signed field trip consent form by Friday.' },
  'email-2': { events: [{ date: '2026-05-23 08:00 AM', description: 'AllStars Football Training (heat adjustment)' }], actionItems: [{ action: 'Pack extra water bottles for kids football training', owner: 'Both', deadline: '2026-05-23' }, { action: 'Complete Summer Cup registration and order kit', owner: 'Ahmed', deadline: '2026-05-22' }], documentsNeeded: ['Football kit size details'], deadlines: [{ item: 'Tournament registration due', date: '2026-05-22', urgency: 'high' }], needsReply: false, draftReply: null, summary: 'Kids football training rescheduled to 8:00 AM this Saturday due to heat. Kit ordering closes Friday.' },
  'email-3': { events: [{ date: '2026-05-27 (Suggested)', description: 'Annual Pediatric Health Check' }], actionItems: [{ action: 'Book clinic appointments for Yusuf and Layla health checks', owner: 'Sara', deadline: '2026-05-24' }], documentsNeeded: ['Health Insurance Card', 'Emirates ID'], deadlines: [{ item: 'Health Check Booking', date: '2026-05-24', urgency: 'medium' }], needsReply: false, draftReply: null, summary: "Book Yusuf and Layla's annual pediatric checkups. Bring insurance and Emirates IDs." },
  'email-4': { events: [{ date: '2026-07-05 09:40 AM', description: 'Flight EK007 DXB to LHR' }], actionItems: [{ action: 'Update passport information in Emirates booking portal', owner: 'Sara', deadline: '2026-06-28' }, { action: "Verify Sara's UK passport validity status", owner: 'Sara', deadline: '2026-06-28' }], documentsNeeded: ['Sara UK Passport'], deadlines: [{ item: 'Manage Booking passport entry', date: '2026-06-28', urgency: 'medium' }], needsReply: false, draftReply: null, summary: 'Flight DXB to LHR confirmed for July 5. Update passport details at least 7 days before departure.' },
  'email-5': { events: [], actionItems: [{ action: 'Review and confirm family health insurance renewal options', owner: 'Ahmed', deadline: '2026-06-18' }], documentsNeeded: ['Cigna Health Insurance Card'], deadlines: [{ item: 'Insurance Renewal Deadline', date: '2026-06-18', urgency: 'high' }], needsReply: true, draftReply: 'Dear Cigna Renewals Team,\n\nI would like to review our renewal options for Policy #CG-998877. Could you please send over the premium options for confirming the current benefits versus switching plans?\n\nBest regards,\nAhmed', summary: 'Review and renew family health insurance plan within 30 days to avoid a coverage gap.' },
  'email-6': { events: [], actionItems: [{ action: 'Pay school tuition fees for Term 3', owner: 'Ahmed', deadline: '2026-06-02' }], documentsNeeded: ['Tuition invoice PDF'], deadlines: [{ item: 'Tuition fees due date', date: '2026-06-02', urgency: 'high' }], needsReply: false, draftReply: null, summary: 'Greenwood school fees of AED 24,500 due by June 2. 5% late fee applies after the deadline.' },
  'email-7': { events: [{ date: '2026-05-24 09:00 AM', description: 'Residency Visa Renewal Biometrics Appointment' }], actionItems: [{ action: 'Attend Residency Visa Renewal Biometrics Appointment at Al Manara Centre', owner: 'Ahmed', deadline: '2026-05-24' }, { action: 'Prepare Original Passport, 4 photos, and signed NOC sponsor letter', owner: 'Ahmed', deadline: '2026-05-23' }], documentsNeeded: ['Original Passport', 'NOC sponsor letter', '4 passport-sized photos'], deadlines: [{ item: 'Biometrics Appointment', date: '2026-05-24', urgency: 'high' }], needsReply: false, draftReply: null, summary: 'Attend biometrics visa appointment on May 24, bringing original passport, photos, and NOC sponsor letter.' },
  'email-10': { events: [{ date: '2026-06-04', description: 'Year 4 Adventure Camp overnight trip to Hatta' }], actionItems: [{ action: 'Submit AED 250 payment for Year 4 overnight camp', owner: 'Ahmed', deadline: '2026-05-27' }, { action: 'Submit signed physical consent and medical questionnaire to Ms. Henderson', owner: 'Sara', deadline: '2026-05-27' }], documentsNeeded: ['Signed Consent Form', 'Medical Questionnaire'], deadlines: [{ item: 'Camp payment & form deadline', date: '2026-05-27', urgency: 'medium' }], needsReply: false, draftReply: null, summary: 'Year 4 overnight Hatta trip consent, medical form, and AED 250 payment due next Wednesday, May 27.' },
  'email-11': { events: [], actionItems: [{ action: 'Review car insurance renewal quote and lock rate', owner: 'Ahmed', deadline: '2026-05-25' }], documentsNeeded: ['AXA Quote details'], deadlines: [{ item: 'AXA lock-in rate window', date: '2026-05-25', urgency: 'medium' }], needsReply: true, draftReply: 'Dear AXA Team,\n\nI received our comprehensive car insurance renewal quote (#AX-4433) for the SUV. Could you confirm if there are any loyalty discounts available before we lock it in?\n\nBest regards,\nAhmed', summary: 'SUV car insurance renewal quote received. Respond by May 25 to secure the rate and avoid a lapse.' },
  'email-12': { events: [{ date: '2026-05-23 10:30 AM', description: 'Yusuf Swimming Assessment' }], actionItems: [{ action: 'Bring Yusuf to Hamdan Sports Complex for swim assessment (15 min early)', owner: 'Sara', deadline: '2026-05-23' }, { action: 'Pack swim goggles, cap, and dry towel for assessment', owner: 'Sara', deadline: '2026-05-23' }], documentsNeeded: ['Swim cap & goggles'], deadlines: [{ item: 'Swimming Assessment date', date: '2026-05-23', urgency: 'medium' }], needsReply: false, draftReply: null, summary: 'Yusuf swim assessment scheduled for Saturday, May 23 at Hamdan Sports Complex at 10:30 AM.' },
  'email-15': { events: [], actionItems: [{ action: 'Verify and submit Year 4 English reading homework log', owner: 'Sara', deadline: '2026-05-21' }], documentsNeeded: ['Reading log book'], deadlines: [{ item: 'English reading log submission', date: '2026-05-21', urgency: 'high' }], needsReply: false, draftReply: null, summary: 'Verify and submit Year 4 English reading homework log on parent portal by Thursday, May 21.' },
};

export const DEFAULT_RENEWAL_PLANS: Record<string, RenewalStep[]> = {
  'UAE Passport': [
    { title: 'Submit ICP Portal Request', details: 'Log in to the ICP Smart Channels app or website using UAE PASS. Fill in the online form, upload bio details and a compliant biometric photo.', fee: 'AED 150', location: 'ICP Portal / App' },
    { title: 'Settle Renewal Fees', details: 'Pay the application and delivery fees securely online to initiate immediate processing.', fee: 'AED 150', location: 'Online Payment Gateway' },
    { title: 'Courier Delivery', details: 'The new unified UAE Passport will be printed and dispatched via Zajel or Emirates Post directly to your registered family address.', fee: 'Free (Included)', location: 'Home Delivery' },
  ],
  'UAE Driving Licence': [
    { title: 'Perform RTA Eye Test', details: 'Visit an RTA authorized optical shop to undergo the mandatory eye test. Results sync immediately to RTA.', fee: 'AED 150', location: 'Authorized Optician Shop' },
    { title: 'Clear Pending Traffic Fines', details: 'All pending Dubai Police or RTA traffic fines must be settled in full to unlock the licence renewal application.', fee: 'Depends on fines', location: 'Dubai Police App / RTA' },
    { title: 'Submit Renewal on RTA Portal', details: 'Access the RTA app, upload your digital profile photo, and pay the renewal fee. Instant digital licence is generated.', fee: 'AED 320', location: 'RTA Smart App' },
    { title: 'Receive Physical Card', details: 'Receive your high-fidelity smart driving licence card via RTA smart kiosks or standard courier delivery.', fee: 'AED 20 courier', location: 'RTA Kiosk / Delivery' },
  ],
  'UK Passport': [
    { title: 'Submit HMPO Online Application', details: 'Access the official HM Passport Office portal for overseas applications. Complete the form and pay overseas fees.', fee: '£105.50 (approx AED 490)', location: 'HMPO Online Portal' },
    { title: 'Submit Digital Photo', details: 'Take a professional passport photo and upload the digital photo code that meets strict UK standards.', fee: 'AED 50', location: 'Trusted Photo Studio' },
    { title: 'Courier Original Passport', details: 'Mail your old UK passport securely via DHL Express to the HMPO processing hub in Newcastle, UK.', fee: 'AED 150 courier', location: 'DHL Express Centre' },
    { title: 'Wait for Verification & Dispatch', details: 'HMPO processes renewals in 8-10 weeks. The new biometric passport and your cancelled old passport are delivered separately.', fee: 'Free (Included)', location: 'Secure Courier' },
  ],
  'School ID': [
    { title: 'Log in to Parent Portal', details: 'Access the Greenwood School Parent Portal and go to the Student Profile Management tab.', fee: 'Free', location: 'Greenwood Portal' },
    { title: 'Upload New Student Photo', details: 'Upload a recent, front-facing profile photo in school uniform against a white background.', fee: 'Free', location: 'Portal Upload' },
    { title: 'Settle Printing Fee', details: 'Settle the nominal plastic card printing fee via the parent portal online checkout.', fee: 'AED 50', location: 'School Payment Portal' },
    { title: 'Collect from Admin Office', details: 'New smart school IDs are distributed to class teachers or available at front reception.', fee: 'Free', location: 'Greenwood Admin Desk' },
  ],
  'Health Insurance Card': [
    { title: 'Request Cigna Quotes', details: 'Contact your accounts representative or log into the Cigna portal to receive renewal quotes with the latest coverage schedules.', fee: 'Free', location: 'Cigna Portal' },
    { title: 'Verify Medical Declarations', details: 'Review and sign updated family medical declarations and pre-existing condition reports.', fee: 'Free', location: 'Online Sign Tool' },
    { title: 'Approve & Settle Premium', details: 'Authorize premium payment or confirm corporate sponsorship allocations to ensure zero lapse in continuity.', fee: 'Paid by Sponsor / Custom', location: 'Payment Portal' },
    { title: 'Download Digital Cards', details: 'Cards are generated instantly. Sync new policy details to the Cigna app and Apple Wallet.', fee: 'Free', location: 'Cigna App / Apple Wallet' },
  ],
  'Home Contents Insurance': [
    { title: 'Declare Household Valuations', details: 'Evaluate and declare updated values for furniture, electronics, appliances, and high-value personal assets.', fee: 'Free', location: 'Insurance portal' },
    { title: 'Submit Premium Renewal', details: 'Confirm coverage benefits (up to AED 250,000 protection) and pay the annual premium fee online.', fee: 'AED 450', location: 'Payment Gateway' },
  ],
  'Car Insurance': [
    { title: 'Vehicle Passing Inspection', details: 'For cars older than 3 years, drive to a Tasjeel center for the mandatory RTA vehicle safety passing inspection.', fee: 'AED 170', location: 'Tasjeel RTA Centre' },
    { title: 'Renew AXA Policy', details: 'Settle the comprehensive car insurance renewal premium. Cover details upload to the RTA traffic file immediately.', fee: 'AED 1,650', location: 'AXA Portal / App' },
    { title: 'Renew RTA Mulkiya', details: 'Log in to RTA app, check traffic file, settle RTA renewal fee, and generate the electronic Mulkiya.', fee: 'AED 350', location: 'RTA Smart App' },
  ],
};
