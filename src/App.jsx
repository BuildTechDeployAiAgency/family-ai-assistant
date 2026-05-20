import React, { useState, useEffect } from 'react'

// ==========================================
// 1. CONSTANTS & INITIAL MOCK DATA
// ==========================================

const REFERENCE_DATE = '2026-05-19';

const FAMILY_MEMBERS = {
  Ahmed: { name: 'Ahmed', role: 'Parent 1', avatar: '👨‍💼', color: 'bg-indigo-50 border-indigo-100 text-indigo-750', initials: 'A' },
  Sara: { name: 'Sara', role: 'Parent 2', avatar: '👩‍⚕️', color: 'bg-rose-50 border-rose-100 text-rose-750', initials: 'S' },
  Yusuf: { name: 'Yusuf', role: 'Child 1 (9)', avatar: '👦', color: 'bg-amber-50 border-amber-100 text-amber-750', initials: 'Y' },
  Layla: { name: 'Layla', role: 'Child 2 (6)', avatar: '👧', color: 'bg-emerald-50 border-emerald-100 text-emerald-750', initials: 'L' },
  Family: { name: 'Family', role: 'Household', avatar: '🏡', color: 'bg-teal-50 border-teal-100 text-teal-750', initials: 'F' }
};

const INITIAL_DOCUMENTS = [
  { id: 'doc-1', name: 'UAE Passport', number: 'N1234567', expiryDate: '2024-11-15', owner: 'Ahmed', category: 'Identity', progress: 0 },
  { id: 'doc-2', name: 'UAE Driving Licence', number: 'DL-99887', expiryDate: '2026-07-01', owner: 'Ahmed', category: 'Driving', progress: 85 },
  { id: 'doc-3', name: 'UAE Passport', number: 'N7654321', expiryDate: '2027-09-20', owner: 'Sara', category: 'Identity', progress: 100 },
  { id: 'doc-4', name: 'UK Passport', number: 'GB-887766', expiryDate: '2025-06-10', owner: 'Sara', category: 'Identity', progress: 0 },
  { id: 'doc-5', name: 'UAE Passport', number: 'N2468101', expiryDate: '2026-08-05', owner: 'Yusuf', category: 'Identity', progress: 75 },
  { id: 'doc-6', name: 'School ID', number: 'SCH-998', expiryDate: '2026-06-30', owner: 'Yusuf', category: 'Education', progress: 65 },
  { id: 'doc-7', name: 'UAE Passport', number: 'N1357911', expiryDate: '2027-03-12', owner: 'Layla', category: 'Identity', progress: 100 },
  { id: 'doc-8', name: 'Health Insurance Card', number: 'CIG-8833', expiryDate: '2025-05-31', owner: 'Layla', category: 'Health', progress: 0 },
  { id: 'doc-9', name: 'Home Contents Insurance', number: 'HC-9922', expiryDate: '2026-07-15', owner: 'Family', category: 'Finance', progress: 80 },
  { id: 'doc-10', name: 'Car Insurance', number: 'CI-3344', expiryDate: '2026-07-22', owner: 'Family', category: 'Driving', progress: 82 }
];

const INITIAL_EMAILS = [
  {
    id: 'email-1',
    from: 'Greenwood International School <admin@greenwood.sch.ae>',
    subject: 'Weekly Newsletter: Parent-Teacher Meetings & Book Fair Deadline',
    date: '2026-05-18',
    icon: '🏫',
    category: 'Education',
    body: 'Dear Parents,\n\nPlease note that the Parent-Teacher meetings are scheduled for next Tuesday, May 26. Individual slots must be booked via the portal.\n\nAlso, the deadline to register for the annual Book Fair and submit reading selections is this Friday, May 22.\n\nFinally, the consent and permission slip for the Year 4 field trip must be returned signed by Friday afternoon.\n\nBest regards,\nGreenwood Admin',
    read: false
  },
  {
    id: 'email-2',
    from: 'AllStars Football Academy <coach.marcus@allstars.ae>',
    subject: 'Training Schedule Change & Tournament Registration',
    date: '2026-05-17',
    icon: '⚽',
    category: 'Sports',
    body: 'Hello families,\n\nPlease note training this Saturday (May 23) is moved to 8:00 AM due to the forecasted heat. Please ensure the kids bring plenty of water.\n\nAlso, registration for the Summer Cup tournament closes in exactly 5 days (May 22). Please complete the kit order form at your earliest convenience to secure the new jerseys.\n\nBest,\nCoach Marcus',
    read: false
  },
  {
    id: 'email-3',
    from: "King's College Hospital Clinic <pediatrics@kingsclinic.ae>",
    subject: 'Annual Pediatric Health Check Reminder',
    date: '2026-05-19',
    icon: '🩺',
    category: 'Health',
    body: 'Dear Sara,\n\nThis is a reminder that Yusuf and Layla are due for their annual pediatric health check. Keeping up with annual checks is important for their school health records.\n\nPlease use the link below to book their slots for next week. Remember to bring your valid health insurance card and Emirates ID to the appointment.\n\nWarm regards,\nPediatric Team',
    read: false
  },
  {
    id: 'email-4',
    from: 'Emirates Airlines <booking@emirates.com>',
    subject: 'Flight Confirmation: Dubai to London Heathrow',
    date: '2026-05-15',
    icon: '✈️',
    category: 'Travel',
    body: 'Thank you for booking with Emirates.\n\nYour flight EK007 from DXB to LHR is confirmed for July 5, 2026 (in 47 days). Departure is at 09:40 AM.\n\nPlease ensure you update your passport details in the manage booking portal at least 7 days before departure. Note that Sara\'s British passport must be valid for travel.',
    read: true
  },
  {
    id: 'email-5',
    from: 'Cigna Global Health <renewals@cigna.com>',
    subject: 'URGENT: Family Health Insurance Renewal Notice',
    date: '2026-05-19',
    icon: '🛡️',
    category: 'Insurance',
    body: 'Dear Ahmed,\n\nYour family health insurance policy (Policy #CG-998877) will renew in exactly 30 days on June 18, 2026.\n\nAction is required to confirm your current plan benefits or switch plans before the automatic renewal date. Failure to respond may lead to a temporary gap in coverage or premium increase.\n\nSincerely,\nCigna Renewals Team',
    read: false
  },
  {
    id: 'email-6',
    from: 'Greenwood Accounts Office <finance@greenwood.sch.ae>',
    subject: 'Term 3 Tuition Fees Invoice - Due in 14 Days',
    date: '2026-05-18',
    icon: '💵',
    category: 'Finance',
    body: 'Dear Parents,\n\nThe Term 3 tuition fees invoice for Yusuf and Layla Hassan has been generated.\n\nThe total amount due is AED 24,500, payable by June 2, 2026 (in 14 days). Please use our online payment portal to settle this invoice. A 5% late fee applies to payments received after the deadline.\n\nGreenwood Finance',
    read: false
  },
  {
    id: 'email-7',
    from: 'GDRFA Dubai <no-reply@gdrfad.gov.ae>',
    subject: 'Residency Visa Renewal Appointment Confirmed',
    date: '2026-05-19',
    icon: '🛂',
    category: 'Admin',
    body: 'Dear Ahmed Hassan,\n\nYour residency visa renewal biometrics appointment is confirmed for May 24, 2026, at 9:00 AM at the Al Manara Centre.\n\nPlease bring:\n1) Original Passport\n2) 4 passport-sized photos with white background\n3) Signed NOC letter from your sponsor\n\nThank you,\nGDRFA Support',
    read: false
  },
  {
    id: 'email-8',
    from: 'Dubai Active Summer Camps <info@dubaiactive.com>',
    subject: 'Summer Camp Registration Opens Monday!',
    date: '2026-05-16',
    icon: '🏕️',
    category: 'Activities',
    body: 'Get ready for summer!\n\nSummer Camp registration opens next Monday, May 25. Our early bird discount (15% off) ends in 10 days on May 29.\n\nSpaces are strictly limited and will be allocated on a first-come, first-served basis. Sign up Layla and Yusuf today to guarantee their places!\n\nWarmly,\nDubai Active Team',
    read: true
  },
  {
    id: 'email-9',
    from: 'Pearl Dental Clinic Dubai <reception@pearldental.ae>',
    subject: '6-Month Dental Checkup Overdue Notice',
    date: '2026-05-12',
    icon: '🦷',
    category: 'Health',
    body: 'Hi Sara,\n\nOur records show that Yusuf and Layla\'s routine 6-month dental cleaning and checkup are now overdue. Regular checks help prevent cavities!\n\nPlease call our reception desk at 04-333-2211 to book an appointment this week so we can maintain their smiles.\n\nBest,\nPearl Dental Clinic',
    read: true
  },
  {
    id: 'email-10',
    from: 'Greenwood Year 4 Coordinator <y4trip@greenwood.sch.ae>',
    subject: 'Year 4 Adventure Camp - Consent and Payment Due Next Wednesday',
    date: '2026-05-17',
    icon: '⛺',
    category: 'Education',
    body: 'Hi Parents,\n\nDetails for the Year 4 overnight trip to Hatta are attached. The total cost is AED 250 (£45 equivalent) and is due by next Wednesday, May 27.\n\nPlease submit the signed physical consent form and the completed medical conditions questionnaire to the class teacher.\n\nThanks,\nMs. Henderson',
    read: false
  },
  {
    id: 'email-11',
    from: 'AXA Gulf Insurance <quotes@axagulf.ae>',
    subject: 'Car Insurance Renewal Quote - Policy #AX-4433',
    date: '2026-05-18',
    icon: '🚗',
    category: 'Insurance',
    body: 'Dear Ahmed,\n\nYour comprehensive car insurance policy for your SUV will expire on June 15, 2026.\n\nYour renewal quote is attached with a 20% premium adjustment due to market rates. Please respond within 7 days (by May 25) to lock in this rate and avoid a lapse of registration.\n\nBest regards,\nAXA Team',
    read: false
  },
  {
    id: 'email-12',
    from: 'Hamilton Aquatics Dubai <lessons@hamiltonaquatics.ae>',
    subject: 'Swimming Lesson Level Assessment - Saturday May 23',
    date: '2026-05-19',
    icon: '🏊',
    category: 'Sports',
    body: 'Hi Sara,\n\nYusuf\'s swimming level assessment is scheduled for this coming Saturday, May 23, at 10:30 AM at the Hamdan Sports Complex.\n\nPlease ensure he arrives 15 minutes early and brings his goggles, swim cap, and dry towel.\n\nRegards,\nHamilton Coaching Team',
    read: false
  },
  {
    id: 'email-13',
    from: 'Tiny Tots Nursery Dubai <accounts@tinytots.ae>',
    subject: 'Monthly Nursery Fees Invoice - June 2026',
    date: '2026-05-19',
    icon: '🧸',
    category: 'Finance',
    body: 'Dear Parents,\n\nThe monthly tuition invoice for Layla\'s morning nursery sessions for June 2026 is AED 3,200.\n\nPayment is due in full by June 1, 2026. Please transfer to the bank details enclosed in the attached invoice PDF.\n\nWarm regards,\nTiny Tots Finance',
    read: true
  },
  {
    id: 'email-14',
    from: 'British Embassy Dubai <consular.dubai@fcdo.gov.uk>',
    subject: 'Important consular update: UK Passport renewal times',
    date: '2026-05-10',
    icon: '🇬🇧',
    category: 'Admin',
    body: 'Dear British Citizens,\n\nPlease be advised that the current processing time for UK passport renewals submitted from overseas is now running at 8 to 10 weeks due to seasonal demand.\n\nWe strongly advise applying early for summer travel. Do not book travel until you have your new passport.\n\nBritish Consular Services',
    read: true
  },
  {
    id: 'email-15',
    from: 'Greenwood Portal <notifications@greenwood.portal.ae>',
    subject: 'New message from Class Teacher Ms. Henderson',
    date: '2026-05-19',
    icon: '📝',
    category: 'Education',
    body: 'Notification:\n\nA new message has been posted on the Greenwood Parent Portal.\n\nMs. Henderson has requested all parents of Year 4 students to verify and submit the English reading homework log by this Thursday, May 21.\n\nGreenwood Portal',
    read: false
  }
];

// High-fidelity pre-computed live fallbacks for single email AI analysis
const MOCK_AI_RESPONSES = {
  'email-1': {
    events: [{ date: '2026-05-26', description: 'Parent-Teacher Meetings' }],
    actionItems: [
      { action: 'Book Parent-Teacher meeting slot in school portal', owner: 'Both', deadline: '2026-05-25' },
      { action: 'Register for annual Book Fair and submit reading selections', owner: 'Sara', deadline: '2026-05-22' },
      { action: 'Return signed Year 4 trip permission consent slip', owner: 'Ahmed', deadline: '2026-05-22' }
    ],
    documentsNeeded: ['Consent Slip (signed)'],
    deadlines: [
      { item: 'Field trip consent due', date: '2026-05-22', urgency: 'high' },
      { item: 'Book Fair registry due', date: '2026-05-22', urgency: 'high' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Book Parent-Teacher meeting slots, submit Book Fair registry, and return signed field trip consent form by Friday.'
  },
  'email-2': {
    events: [{ date: '2026-05-23 08:00 AM', description: 'AllStars Football Training (heat adjustment)' }],
    actionItems: [
      { action: 'Pack extra water bottles for kids football training', owner: 'Both', deadline: '2026-05-23' },
      { action: 'Complete Summer Cup registration and order kit', owner: 'Ahmed', deadline: '2026-05-22' }
    ],
    documentsNeeded: ['Football kit size details'],
    deadlines: [
      { item: 'Tournament registration due', date: '2026-05-22', urgency: 'high' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Kids football training rescheduled to 8:00 AM this Saturday due to heat. Kit ordering closes Friday.'
  },
  'email-3': {
    events: [{ date: '2026-05-27 (Suggested)', description: 'Annual Pediatric Health Check' }],
    actionItems: [
      { action: 'Book clinic appointments for Yusuf and Layla health checks', owner: 'Sara', deadline: '2026-05-24' }
    ],
    documentsNeeded: ['Health Insurance Card', 'Emirates ID'],
    deadlines: [
      { item: 'Health Check Booking', date: '2026-05-24', urgency: 'medium' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Book Yusuf and Layla\'s annual pediatric checkups at King\'s College Clinic. Bring insurance and Emirates IDs.'
  },
  'email-4': {
    events: [{ date: '2026-07-05 09:40 AM', description: 'Flight EK007 DXB to LHR' }],
    actionItems: [
      { action: 'Update passport information in Emirates booking portal', owner: 'Sara', deadline: '2026-06-28' },
      { action: 'Verify Sara\'s UK passport validity status', owner: 'Sara', deadline: '2026-06-28' }
    ],
    documentsNeeded: ['Sara UK Passport'],
    deadlines: [
      { item: 'Manage Booking passport entry', date: '2026-06-28', urgency: 'medium' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Flight DXB to LHR confirmed for July 5. Update passport details in manage booking at least 7 days before departure.'
  },
  'email-5': {
    events: [],
    actionItems: [
      { action: 'Review and confirm family health insurance renewal options', owner: 'Ahmed', deadline: '2026-06-18' }
    ],
    documentsNeeded: ['Cigna Health Insurance Card'],
    deadlines: [
      { item: 'Insurance Renewal Deadline', date: '2026-06-18', urgency: 'high' }
    ],
    needsReply: true,
    draftReply: 'Dear Cigna Renewals Team,\n\nI would like to review our renewal options for Policy #CG-998877. Could you please send over the premium options for confirming the current benefits versus switching plans?\n\nBest regards,\nAhmed Hassan',
    summary: 'Review and renew family health insurance plan within 30 days to avoid a coverage gap.'
  },
  'email-6': {
    events: [],
    actionItems: [
      { action: 'Pay school tuition fees for Term 3 (Yusuf & Layla)', owner: 'Ahmed', deadline: '2026-06-02' }
    ],
    documentsNeeded: ['Tuition invoice PDF'],
    deadlines: [
      { item: 'Tuition fees due date', date: '2026-06-02', urgency: 'high' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Greenwood school fees of AED 24,500 due by June 2. 5% late fee applies after the deadline.'
  },
  'email-7': {
    events: [{ date: '2026-05-24 09:00 AM', description: 'Residency Visa Renewal Biometrics Appointment' }],
    actionItems: [
      { action: 'Attend Residency Visa Renewal Biometrics Appointment at Al Manara Centre', owner: 'Ahmed', deadline: '2026-05-24' },
      { action: 'Prepare Original Passport, 4 photos, and signed NOC sponsor letter', owner: 'Ahmed', deadline: '2026-05-23' }
    ],
    documentsNeeded: ['Original Passport', 'NOC sponsor letter', '4 passport-sized photos'],
    deadlines: [
      { item: 'Biometrics Appointment', date: '2026-05-24', urgency: 'high' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Attend biometrics visa appointment on May 24, bringing original passport, photos, and NOC sponsor letter.'
  },
  'email-10': {
    events: [{ date: '2026-06-04', description: 'Year 4 Adventure Camp overnight trip to Hatta' }],
    actionItems: [
      { action: 'Submit AED 250 payment for Year 4 overnight camp', owner: 'Ahmed', deadline: '2026-05-27' },
      { action: 'Submit signed physical consent and medical questionnaire to Ms. Henderson', owner: 'Sara', deadline: '2026-05-27' }
    ],
    documentsNeeded: ['Signed Consent Form', 'Medical Questionnaire'],
    deadlines: [
      { item: 'Camp payment & form deadline', date: '2026-05-27', urgency: 'medium' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Year 4 overnight Hatta trip consent, medical form, and AED 250 payment due next Wednesday, May 27.'
  },
  'email-11': {
    events: [],
    actionItems: [
      { action: 'Review car insurance renewal quote and lock rate', owner: 'Ahmed', deadline: '2026-05-25' }
    ],
    documentsNeeded: ['AXA Quote details'],
    deadlines: [
      { item: 'AXA lock-in rate window', date: '2026-05-25', urgency: 'medium' }
    ],
    needsReply: true,
    draftReply: 'Dear AXA Team,\n\nI received our comprehensive car insurance renewal quote (#AX-4433) for the SUV. Could you confirm if there are any loyalty discounts available to adjust the premium rates before we lock it in?\n\nBest regards,\nAhmed Hassan',
    summary: 'SUV car insurance renewal quote received. Respond by May 25 to secure the rate and avoid a lapse.'
  },
  'email-12': {
    events: [{ date: '2026-05-23 10:30 AM', description: 'Yusuf Swimming Assessment' }],
    actionItems: [
      { action: 'Bring Yusuf to Hamdan Sports Complex for swim assessment (15 min early)', owner: 'Sara', deadline: '2026-05-23' },
      { action: 'Pack swim goggles, cap, and dry towel for assessment', owner: 'Sara', deadline: '2026-05-23' }
    ],
    documentsNeeded: ['Swim cap & goggles'],
    deadlines: [
      { item: 'Swimming Assessment date', date: '2026-05-23', urgency: 'medium' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Yusuf swim assessment scheduled for Saturday, May 23 at Hamdan Sports Complex at 10:30 AM.'
  },
  'email-15': {
    events: [],
    actionItems: [
      { action: 'Verify and submit Year 4 English reading homework log', owner: 'Sara', deadline: '2026-05-21' }
    ],
    documentsNeeded: ['Reading log book'],
    deadlines: [
      { item: 'English reading log submission', date: '2026-05-21', urgency: 'high' }
    ],
    needsReply: false,
    draftReply: null,
    summary: 'Verify and submit Year 4 English reading homework log on parent portal by Thursday, May 21.'
  }
};

// Custom premium localized step-by-step renewal plans (UAE specific)
const DEFAULT_RENEWAL_PLANS = {
  'UAE Passport': [
    { title: 'Submit ICP Portal Request', details: 'Log in to the ICP Smart Channels app or website using UAE PASS. Fill in the online form, upload bio details and a compliant biometric photo.', fee: 'AED 150', location: 'ICP Portal / App' },
    { title: 'Settle Renewal Fees', details: 'Pay the application and delivery fees securely online to initiate immediate processing.', fee: 'AED 150', location: 'Online Payment Gateway' },
    { title: 'Courier Delivery', details: 'The new unified UAE Passport will be printed and dispatched via Zajel or Emirates Post directly to your registered family address.', fee: 'Free (Included)', location: 'Home Delivery' }
  ],
  'UAE Driving Licence': [
    { title: 'Perform RTA Eye Test', details: 'Visit an RTA authorized optical shop (e.g. Al Jaber, Yateem) to undergo the mandatory eye test. Results sync immediately to RTA.', fee: 'AED 150', location: 'Authorized Optician Shop' },
    { title: 'Clear Pending Traffic Fines', details: 'All pending Dubai Police or RTA traffic fines must be settled in full to unlock the licence renewal application.', fee: 'Depends on fines', location: 'Dubai Police App / RTA' },
    { title: 'Submit Renewal on RTA Portal', details: 'Access the RTA app or website, upload your digital profile photo, and pay the renewal fee. Instant digital licence is generated.', fee: 'AED 320', location: 'RTA Smart App' },
    { title: 'Receive Physical Card', details: 'Receive your high-fidelity smart driving licence card via RTA smart kiosks or standard courier delivery.', fee: 'AED 20 courier', location: 'RTA Kiosk / Delivery' }
  ],
  'UK Passport': [
    { title: 'Submit HMPO Online Application', details: 'Access the official Her Majesty\'s Passport Office portal for overseas applications. Complete the application form and pay overseas fees.', fee: '£105.50 (approx AED 490)', location: 'HMPO Online Portal' },
    { title: 'Submit Digital Photo', details: 'Take a professional passport photo at a studio and upload the digital photo code or high-resolution file that meets strict UK standards.', fee: 'AED 50', location: 'Trusted Photo Studio' },
    { title: 'Courier Original Passport', details: 'Mail your old UK passport securely via DHL Express to the HMPO processing hub in Newcastle, UK.', fee: 'AED 150 courier', location: 'DHL Express Centre' },
    { title: 'Wait for Verification & Dispatch', details: 'HMPO processes renewals in 8-10 weeks. The new biometric passport and your cancelled old passport are delivered via separate DHL packages.', fee: 'Free (Included)', location: 'Secure Courier' }
  ],
  'School ID': [
    { title: 'Log in to Parent Portal', details: 'Access the Greenwood School Parent Portal and go to the Student Profile Management tab.', fee: 'Free', location: 'Greenwood Portal' },
    { title: 'Upload New Student Photo', details: 'Upload a recent, high-contrast, front-facing profile photo of your child in school uniform against a white background.', fee: 'Free', location: 'Portal Upload' },
    { title: 'Settle Printing Fee', details: 'Settle the nominal plastic card printing fee via the parent portal online checkout.', fee: 'AED 50', location: 'School Payment Portal' },
    { title: 'Collect from Admin Office', details: 'New smart school IDs are distributed to class teachers. Yusuf can collect it directly or you can pick it up from front reception.', fee: 'Free', location: 'Greenwood Admin Desk' }
  ],
  'Health Insurance Card': [
    { title: 'Request Cigna Quotes', details: 'Contact your dedicated corporate accounts representative or log into Cigna portal to receive renewal quotes with the latest coverage schedules.', fee: 'Free', location: 'Cigna Portal' },
    { title: 'Verify Medical Declarations', details: 'Review and sign updated family medical declarations and pre-existing condition reports on behalf of Ahmed, Sara, Yusuf, and Layla.', fee: 'Free', location: 'Online Sign Tool' },
    { title: 'Approve & Settle Premium', details: 'Authorize premium payment or confirm corporate sponsorship allocations to ensure zero lapse in continuity.', fee: 'Paid by Sponsor / Custom', location: 'Payment Portal' },
    { title: 'Download Digital Cards', details: 'Cards are generated instantly. Sync new policy details to the Cigna app and Apple Wallet to utilize health networks immediately.', fee: 'Free', location: 'Cigna App / Apple Wallet' }
  ],
  'Home Contents Insurance': [
    { title: 'Declare Household Valuations', details: 'Evaluate and declare updated values for furniture, electronic devices, appliances, and high-value family personal assets.', fee: 'Free', location: 'Insurance portal' },
    { title: 'Submit Premium Renewal', details: 'Confirm coverage benefits (up to AED 250,000 protection) and pay the annual premium fee online.', fee: 'AED 450', location: 'Payment Gateway' }
  ],
  'Car Insurance': [
    { title: 'Vehicle Passing Inspection', details: 'For cars older than 3 years, drive to a Tasjeel center to undergo the mandatory RTA vehicle safety passing inspection test.', fee: 'AED 170', location: 'Tasjeel RTA Centre' },
    { title: 'Renew AXA Policy', details: 'Settle the comprehensive car insurance renewal premium. Cover details are electronically uploaded to the RTA traffic file immediately.', fee: 'AED 1,650', location: 'AXA Portal / App' },
    { title: 'Renew RTA Mulkiya', details: 'Log in to RTA app, check traffic file for passing certificate and insurance upload, settle RTA renewal fee, and generate electronic Mulkiya.', fee: 'AED 350', location: 'RTA Smart App' }
  ]
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

const parseDate = (str) => new Date(str);

const getDaysDifference = (date1Str, date2Str) => {
  const d1 = parseDate(date1Str);
  const d2 = parseDate(date2Str);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDocumentStatus = (expiryDate) => {
  const diffDays = getDaysDifference(expiryDate, REFERENCE_DATE);
  if (diffDays < 0) return { label: 'Expired', badgeClass: 'bg-rose-50 text-rose-700 border-rose-100/70', textClass: 'text-rose-600', icon: '🔴', urgency: 0 };
  if (diffDays <= 90) return { label: `Soon (<${diffDays}d)`, badgeClass: 'bg-amber-50 text-amber-700 border-amber-100/70', textClass: 'text-amber-600', icon: '🟡', urgency: 1 };
  return { label: 'Valid', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100/70', textClass: 'text-emerald-600', icon: '🟢', urgency: 2 };
};

// Canvas Document Generator for live Multimodal AI scanning demonstration
const generateMockDocumentImage = (type) => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Background
  ctx.fillStyle = '#fcfbf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Outer Border (aesthetic notebook/document border)
  ctx.strokeStyle = '#d7cdbc';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  
  // Fine interior border
  ctx.strokeStyle = '#c4b59b';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  if (type === 'passport') {
    // BURGUNDY HEADER BLOCK (Passport Style)
    ctx.fillStyle = '#7a1b2e';
    ctx.fillRect(22, 22, canvas.width - 44, 180);
    
    // Passport Header Text
    ctx.fillStyle = '#e8c97d'; // Gold text
    ctx.textAlign = 'center';
    
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('UNITED ARAB EMIRATES', canvas.width / 2, 70);
    
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('دولة الإمارات العربية المتحدة', canvas.width / 2, 105);
    
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('PASSPORT / جواز سفر', canvas.width / 2, 160);
    
    // Gold Emirates Emblem Mockup (simple drawings)
    ctx.strokeStyle = '#e8c97d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 290, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8c97d';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('★ ★ UAE ★ ★', canvas.width / 2, 295);
    
    // Photo Box (Left)
    ctx.fillStyle = '#e3dac9';
    ctx.fillRect(60, 380, 160, 210);
    ctx.strokeStyle = '#7a1b2e';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 380, 160, 210);
    
    // Draw simple geometric abstract portrait (Ahmed avatar)
    ctx.fillStyle = '#4a5568'; // Suit/Shoulders
    ctx.beginPath();
    ctx.arc(140, 540, 60, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0'; // Shirt
    ctx.beginPath();
    ctx.moveTo(125, 480);
    ctx.lineTo(140, 510);
    ctx.lineTo(155, 480);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cbd5e1'; // Head
    ctx.beginPath();
    ctx.arc(140, 460, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155'; // Hair
    ctx.beginPath();
    ctx.arc(140, 445, 40, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1e293b'; // Eyes
    ctx.fillRect(125, 455, 8, 4);
    ctx.fillRect(147, 455, 8, 4);
    ctx.fillStyle = '#181512'; // Beard/Moustache
    ctx.fillRect(132, 473, 16, 3);
    
    // Passport Fields (Right)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#181512';
    
    const drawField = (label, arabicLabel, val, x, y) => {
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#7a1b2e';
      ctx.fillText(`${label} / ${arabicLabel}`, x, y);
      
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#181512';
      ctx.fillText(val, x, y + 20);
    };
    
    drawField('Surname', 'الاسم', 'HASSAN', 260, 380);
    drawField('Given Name', 'الاسم الأول', 'AHMED', 260, 430);
    drawField('Nationality', 'الجنسية', 'UNITED ARAB EMIRATES', 260, 480);
    drawField('Passport No.', 'رقم جواز السفر', 'N76251289', 260, 530);
    drawField('Date of Expiry', 'تاريخ الانتهاء', '2026-10-28', 260, 580);
    
    // Bottom MRZ (Machine Readable Zone)
    ctx.fillStyle = '#ebdcc7';
    ctx.fillRect(40, 680, canvas.width - 80, 80);
    ctx.strokeStyle = '#c4b59b';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 680, canvas.width - 80, 80);
    
    ctx.fillStyle = '#4a3b32';
    ctx.font = '15px monospace';
    ctx.fillText('P<AREHASSAN<<AHMED<<<<<<<<<<<<<<<<<<<<<<<<<<', 60, 715);
    ctx.fillText('N762512898ARE8408154M2610283<<<<<<<<<<<<<<<<', 60, 745);

  } else if (type === 'consent') {
    // SCHOOL LETTERHEAD
    ctx.fillStyle = '#2b6cb0'; // School Blue
    ctx.fillRect(22, 22, canvas.width - 44, 150);
    
    // Logo Icon simple drawing
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(80, 95, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('G', 80, 103);
    
    // School Title
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('GREENWOOD INTERNATIONAL SCHOOL', 130, 80);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Al Muhaisnah, Dubai, United Arab Emirates', 130, 105);
    ctx.font = 'italic 12px system-ui, sans-serif';
    ctx.fillText('Nurturing Leaders, Inspiring Excellence', 130, 128);
    
    // Letter details
    ctx.fillStyle = '#181512';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('Date: May 20, 2026', 50, 210);
    ctx.fillText('To: Parents & Guardians of Year 4 Students', 50, 230);
    
    // Subject
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#2b6cb0';
    ctx.fillText('SUBJECT: YEAR 4 EDUCATIONAL TRIP & CONSENT REQUIREMENT', 50, 270);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2b6cb0';
    ctx.beginPath();
    ctx.moveTo(50, 278);
    ctx.lineTo(canvas.width - 50, 278);
    ctx.stroke();
    
    // Body Text
    ctx.fillStyle = '#2d3748';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    
    const drawParagraph = (text, y, spacing = 20) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > canvas.width - 100 && n > 0) {
          ctx.fillText(line, 50, currentY);
          line = words[n] + ' ';
          currentY += spacing;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 50, currentY);
      return currentY + spacing;
    };
    
    let nextY = 310;
    nextY = drawParagraph('Dear Parents,', nextY);
    nextY = drawParagraph('We are delighted to organize an educational field trip to the Dubai Scientific Center scheduled for June 15, 2026. This trip supports our Science curriculum unit on astronomy and modern technology.', nextY + 10);
    nextY = drawParagraph('Due to transport booking and security authorization protocols for school outings, please fulfill these actions by the final deadline of June 5, 2026:', nextY + 10);
    
    // Bullet actions
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#181512';
    ctx.fillText('• Action 1: Upload Child\'s valid Emirates ID or Passport to parent portal.', 70, nextY + 10);
    ctx.fillText('• Action 2: Sign and submit this written Consent Slip below.', 70, nextY + 30);
    ctx.fillText('• Action 3: Settle the nominal entrance fee of AED 120 per child.', 70, nextY + 50);
    
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#2d3748';
    nextY = drawParagraph('We appreciate your continuous support in ensuring interactive learning opportunities for our students.', nextY + 80);
    
    // Sign-off
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('Sincerely,', 50, nextY + 20);
    ctx.fillText('School Administration Team', 50, nextY + 40);
    
    // Consent signature box
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(40, nextY + 70, canvas.width - 80, 110);
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, nextY + 70, canvas.width - 80, 110);
    
    ctx.fillStyle = '#4a5568';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('PARENTAL AUTHORIZATION & SIGNATURE SLIP', 55, nextY + 90);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Student Name: Zayd Hassan (Year 4-A)', 55, nextY + 110);
    
    // Draw school seal stamp (aesthetic red stamp)
    ctx.strokeStyle = 'rgba(186, 26, 26, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(canvas.width - 120, nextY + 60, 32, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(186, 26, 26, 0.55)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('APPROVED', canvas.width - 120, nextY + 57);
    ctx.fillText('GREENWOOD', canvas.width - 120, nextY + 69);
    
    // Signature
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a365d';
    ctx.font = 'italic 16px serif';
    ctx.fillText('Sara Hassan', 55, nextY + 145);
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(55, nextY + 150);
    ctx.lineTo(250, nextY + 150); // signature line
    ctx.stroke();
  }
  
  return canvas.toDataURL('image/png');
};

// ==========================================
// 3. MAIN COMPONENT DEFINITION
// ==========================================

export default function App() {
  // Navigation & Settings State
  const [activeTab, setActiveTab] = useState('documents');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem('openrouter_api_key') || '');
  const [apiModel] = useState(() => import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-3.5-flash');
  const [tempKey, setTempKey] = useState(apiKey);
  const [notification, setNotification] = useState('');
  const [docScanState, setDocScanState] = useState('idle');
  const [showKeyPassword, setShowKeyPassword] = useState(false);

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('family_jwt_token') || '');
  const [user, setUser] = useState(null);
  const [migrateData, setMigrateData] = useState(true);

  // Core Data State
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('family_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });
  
  const [emails, setEmails] = useState(() => {
    const saved = localStorage.getItem('family_emails');
    return saved ? JSON.parse(saved) : INITIAL_EMAILS;
  });

  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [activeEmail, setActiveEmail] = useState(null);

  // AI-related State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  
  // Storage for AI analysis per email
  const [analysisResults, setAnalysisResults] = useState(() => {
    const saved = localStorage.getItem('family_analysis_results');
    return saved ? JSON.parse(saved) : {};
  });

  // Storage for step-by-step renewal plans
  const [renewalPlans, setRenewalPlans] = useState(() => {
    const saved = localStorage.getItem('family_renewal_plans');
    return saved ? JSON.parse(saved) : {};
  });

  // Storage for completed step progress of renewal plans
  const [renewalStepsProgress, setRenewalStepsProgress] = useState(() => {
    const saved = localStorage.getItem('family_renewal_steps_progress');
    return saved ? JSON.parse(saved) : {};
  });

  // Completed dynamically consolidated actions (Tab 3 checkable)
  const [completedActionIds, setCompletedActionIds] = useState(() => {
    const saved = localStorage.getItem('family_completed_action_ids');
    return saved ? JSON.parse(saved) : [];
  });

  // Storage for custom scanned actions
  const [customScannedActions, setCustomScannedActions] = useState(() => {
    const saved = localStorage.getItem('family_custom_scanned_actions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('family_custom_scanned_actions', JSON.stringify(customScannedActions));
  }, [customScannedActions]);

  // Batch Scanning States
  const [isScanningInbox, setIsScanningInbox] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scanStep, setScanStep] = useState(0);

  // Multimodal AI Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [scannerImage, setScannerImage] = useState(null); // base64 Data URL
  const [scannerType, setScannerType] = useState(null); // 'passport' | 'consent' | 'custom' | null
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerProgress, setScannerProgress] = useState('');
  const [scannerResult, setScannerResult] = useState(null);
  const [scannerError, setScannerError] = useState(null);

  // Active document selection for detail view
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Document filter & Search states
  const [docFilter, setDocFilter] = useState('all'); 
  const [docMemberFilter, setDocMemberFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');

  // Email filtering states
  const [emailFilter, setEmailFilter] = useState('all'); 
  const [emailSearchQuery, setEmailSearchQuery] = useState('');

  // Action assignee filtering states
  const [actionAssigneeFilter, setActionAssigneeFilter] = useState('all');

  // Form State for Adding/Editing Document
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocData, setNewDocData] = useState({
    name: '',
    number: '',
    expiryDate: '',
    owner: 'Ahmed',
    category: 'Identity',
    progress: 100
  });

  // Sync initial Hassan family mock data or local storage migrations
  const syncInitialData = async (authToken, currentDocs = INITIAL_DOCUMENTS, currentEmails = INITIAL_EMAILS) => {
    try {
      // 1. Sync documents
      for (const doc of currentDocs) {
        await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(doc)
        });
      }
      // 2. Sync emails
      await fetch('/api/emails/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ emails: currentEmails })
      });
      // 3. Sync custom tasks if any
      const localCustom = localStorage.getItem('family_custom_scanned_actions');
      if (localCustom) {
        const parsedCustom = JSON.parse(localCustom);
        for (const task of parsedCustom) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(task)
          });
        }
      }
      
      // 4. Sync completed tasks
      const localCompleted = localStorage.getItem('family_completed_action_ids');
      if (localCompleted) {
        const parsedCompleted = JSON.parse(localCompleted);
        for (const actionId of parsedCompleted) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              id: actionId,
              title: 'Sync Task',
              assignee: 'Family',
              dueDate: '',
              completed: true,
              category: 'Sync'
            })
          });
        }
      }
    } catch (e) {
      console.error("Migration failed:", e);
    }
  };

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('family_jwt_token');
      if (!storedToken) {
        setToken('');
        setUser(null);
        return;
      }
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('family_jwt_token');
          setToken('');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify token on startup:', err);
        localStorage.removeItem('family_jwt_token');
        setToken('');
        setUser(null);
      }
    };
    verifyToken();
  }, []);

  // Fetch all user specific data from Express + SQLite
  useEffect(() => {
    if (!token || !user) return;
    
    const loadAllUserData = async () => {
      try {
        const docRes = await fetch('/api/documents', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let docs = [];
        if (docRes.ok) {
          docs = await docRes.json();
        }
        
        const emailRes = await fetch('/api/emails', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let ems = [];
        if (emailRes.ok) {
          ems = await emailRes.json();
        }
        
        const taskRes = await fetch('/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let tsks = [];
        if (taskRes.ok) {
          tsks = await taskRes.json();
        }

        // If completely empty, seed standard Hassan Family dashboard data
        if (docs.length === 0 && ems.length === 0) {
          console.log("Empty user profile detected. Migrating local or preloading initial Hassan Family mock data...");
          
          const localDocs = localStorage.getItem('family_documents');
          const finalDocs = localDocs ? JSON.parse(localDocs) : INITIAL_DOCUMENTS;
          
          const localEmails = localStorage.getItem('family_emails');
          const finalEmails = localEmails ? JSON.parse(localEmails) : INITIAL_EMAILS;
          
          await syncInitialData(token, finalDocs, finalEmails);
          
          const docRes2 = await fetch('/api/documents', { headers: { 'Authorization': `Bearer ${token}` } });
          docs = await docRes2.json();
          
          const emailRes2 = await fetch('/api/emails', { headers: { 'Authorization': `Bearer ${token}` } });
          ems = await emailRes2.json();
          
          const taskRes2 = await fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } });
          tsks = await taskRes2.json();
        }
        
        setDocuments(docs);
        setEmails(ems);
        
        const completedIds = tsks.filter(t => t.completed).map(t => t.id);
        setCompletedActionIds(completedIds);
        
        const customActions = tsks.filter(t => !t.id.startsWith('action-doc-') && !t.id.startsWith('action-email-'));
        setCustomScannedActions(customActions);
        
      } catch (err) {
        console.error('Error fetching user data from SQLite:', err);
      }
    };
    
    loadAllUserData();
  }, [token, user]);

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem('family_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('family_emails', JSON.stringify(emails));
  }, [emails]);

  useEffect(() => {
    localStorage.setItem('family_analysis_results', JSON.stringify(analysisResults));
  }, [analysisResults]);

  useEffect(() => {
    localStorage.setItem('family_renewal_plans', JSON.stringify(renewalPlans));
  }, [renewalPlans]);

  useEffect(() => {
    localStorage.setItem('family_renewal_steps_progress', JSON.stringify(renewalStepsProgress));
  }, [renewalStepsProgress]);

  useEffect(() => {
    localStorage.setItem('family_completed_action_ids', JSON.stringify(completedActionIds));
  }, [completedActionIds]);

  // Dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // OpenRouter Call Orchestration
  const callAI = async (systemPrompt, userMessage, key, imageUrl = null) => {
    const activeModel = apiModel || "google/gemini-3.5-flash";
    
    let messages;
    if (imageUrl) {
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://family-ai-poc.app",
        "X-Title": "Family AI Assistant POC"
      },
      body: JSON.stringify({
        model: activeModel,
        messages: messages,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "OpenRouter response error");
    }
    return data.choices[0].message.content;
  };

  const cleanAndParseJSON = (text) => {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim());
  };

  // 1. Analyze single email via OpenRouter (or mock fallback if no key)
  const handleAnalyzeEmail = async (emailId) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      let result;
      if (!apiKey) {
        // Fallback to pre-designed mockup if no key is entered
        await new Promise(resolve => setTimeout(resolve, 1200)); 
        result = MOCK_AI_RESPONSES[emailId] || {
          events: [],
          actionItems: [{ action: `Review details for: ${email.subject}`, owner: 'Both', deadline: REFERENCE_DATE }],
          documentsNeeded: [],
          deadlines: [{ item: 'Review request', date: REFERENCE_DATE, urgency: 'medium' }],
          needsReply: false,
          draftReply: null,
          summary: `Summary of: ${email.subject}. Configure an OpenRouter API key in Settings to trigger live dynamic AI scanning.`
        };
        setNotification('Showing high-fidelity mock analysis.');
      } else {
        const systemPrompt = `You are a Family AI Assistant helping busy parents manage their household.
Analyse the following email and extract structured information in JSON format:
{
  "events": [{"date": "YYYY-MM-DD", "description": "..."}],
  "actionItems": [{"action": "...", "owner": "Ahmed | Sara | Both", "deadline": "YYYY-MM-DD"}],
  "documentsNeeded": ["..."],
  "deadlines": [{"item": "...", "date": "YYYY-MM-DD", "urgency": "high | medium | low"}],
  "needsReply": true/false,
  "draftReply": "..." or null,
  "summary": "One sentence summary of what this email requires"
}
Ahmed refers to 'Parent 1' (male) and Sara refers to 'Parent 2' (female).
Respond ONLY with valid JSON. No preamble, no explanation, no markdown fences.`;

        const userMessage = `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\nBody:\n${email.body}`;
        
        const rawResponse = await callAI(systemPrompt, userMessage, apiKey);
        result = cleanAndParseJSON(rawResponse);
        setNotification('AI analysis completed!');
      }

      setAnalysisResults(prev => ({
        ...prev,
        [emailId]: result
      }));

      // Mark email as read
      if (token) {
        fetch(`/api/emails/${emailId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ read: true })
        }).catch(err => console.error("Error updating email read state in SQLite:", err));
      }
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e));
    } catch (err) {
      console.error(err);
      setAiError(`AI analysis failed: ${err.message}. Ensure your OpenRouter API Key is entered correctly in settings.`);
    } finally {
      setAiLoading(false);
    }
  };

  // 2. Generate custom localized step-by-step renewal plans
  const handleGetRenewalPlan = async (doc) => {
    setAiLoading(true);
    setAiError(null);
    try {
      let plan;
      if (!apiKey) {
        // High fidelity fallback tailored specifically for standard document types
        await new Promise(resolve => setTimeout(resolve, 1500));
        const matchedPlanKey = Object.keys(DEFAULT_RENEWAL_PLANS).find(k => doc.name.toLowerCase().includes(k.toLowerCase()) || doc.category.toLowerCase().includes(k.toLowerCase())) || 'UAE Passport';
        plan = DEFAULT_RENEWAL_PLANS[matchedPlanKey];
        setNotification('Renewal guide generated!');
      } else {
        const systemPrompt = `You are a UAE Government Administrative specialist. 
Provide a localized, detailed, step-by-step renewal roadmap for the family document: "${doc.name}" for owner "${doc.owner}" (Category: ${doc.category}).
Generate 3-4 highly accurate, sequential action steps required to renew this document. Each step must detail:
1) What to do (title & description)
2) Where to go (e.g. ICP Portal, GDRFA center, Tamm, RTA smart app)
3) Expected fee (e.g. AED 150, AED 320)
4) Specific documents/requirements to bring.

Respond ONLY with valid JSON format:
{
  "steps": [
    {
      "title": "...",
      "details": "...",
      "fee": "...",
      "location": "..."
    }
  ]
}
No preamble, no markdown formatting ticks. Output must be raw JSON.`;

        const userMessage = `Document: ${doc.name}\nOwner: ${doc.owner}\nNumber: ${doc.number}\nCategory: ${doc.category}`;
        const rawResponse = await callAI(systemPrompt, userMessage, apiKey);
        const parsed = cleanAndParseJSON(rawResponse);
        plan = parsed.steps || parsed;
        setNotification('Dynamic AI Renewal Plan generated!');
      }

      setRenewalPlans(prev => ({
        ...prev,
        [doc.id]: plan
      }));

      // Initialize step progress
      setRenewalStepsProgress(prev => ({
        ...prev,
        [doc.id]: []
      }));

    } catch (err) {
      console.error(err);
      setAiError(`Unable to generate plan: ${err.message}. Check your API settings.`);
    } finally {
      setAiLoading(false);
    }
  };

  // Toggle single steps in doc renewal plan
  const handleToggleRenewalStep = (docId, stepIndex) => {
    setRenewalStepsProgress(prev => {
      const current = prev[docId] || [];
      const updated = current.includes(stepIndex) 
        ? current.filter(idx => idx !== stepIndex) 
        : [...current, stepIndex];
      
      const newProgress = { ...prev, [docId]: updated };
      
      // Update overall doc progress dynamically if all steps complete
      const plan = renewalPlans[docId] || [];
      if (plan.length > 0) {
        const percentage = Math.round((updated.length / plan.length) * 100);
        setDocuments(docs => docs.map(d => d.id === docId ? { ...d, progress: percentage } : d));
      }
      
      return newProgress;
    });
    setNotification('Progress updated.');
  };

  // 3. Batch scanner simulation / real OpenRouter scanning
  const handleRunFullInboxScan = async () => {
    setIsScanningInbox(true);
    setScanStep(1);
    setScanProgress('Connecting to AI agent...');
    
    try {
      // Step 1: Scan headers
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanStep(2);
      setScanProgress('Parsing 15 incoming family emails...');
      
      // Step 2: Extract events
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanStep(3);
      setScanProgress('Extracting actions, dates, and assignees...');
      
      // Step 3: De-duplicate and verify
      await new Promise(resolve => setTimeout(resolve, 600));
      setScanStep(4);
      setScanProgress('Finalizing Executive Action Digest...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Build out full scan: Analyze all emails with mock responses
      const updatedResults = { ...analysisResults };
      emails.forEach(email => {
        if (!updatedResults[email.id] && MOCK_AI_RESPONSES[email.id]) {
          updatedResults[email.id] = MOCK_AI_RESPONSES[email.id];
        }
      });

      // If live API key is set, let's also mark everything
      setAnalysisResults(updatedResults);
      if (token) {
        emails.forEach(email => {
          fetch(`/api/emails/${email.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ read: true })
          }).catch(err => console.error("Error updating email read state in SQLite:", err));
        });
      }
      setEmails(prev => prev.map(e => ({ ...e, read: true })));
      setNotification('Full inbox scan complete! 11 new tasks extracted.');
      setActiveTab('actions');
    } catch (err) {
      console.error(err);
      alert('Scanning failed.');
    } finally {
      setIsScanningInbox(false);
      setScanStep(0);
      setScanProgress('');
    }
  };

  // Run AI Document scan simulation
  const handleRunDocScan = () => {
    setDocScanState('scanning');
    setNotification('🔄 Scanning Family Cloud for updates...');
    setTimeout(() => {
      setDocScanState('completed');
      setNotification('✨ 3 New Actions Found in Document Vault!');
    }, 2000);
  };

  // Handle image upload from file system
  const handleScannerImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setScannerLoading(true);
    setScannerProgress('Reading uploaded image...');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setScannerImage(event.target.result);
      setScannerType('custom');
      setScannerLoading(false);
      setScannerProgress('');
      setNotification('✨ Custom document image uploaded!');
    };
    reader.onerror = () => {
      setScannerError('Failed to read document file.');
      setScannerLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Select one of the pre-loaded canvas mock document templates
  const handleSelectSampleDocument = (type) => {
    setScannerLoading(true);
    setScannerProgress('Generating high-fidelity document layout...');
    setTimeout(() => {
      const dataUrl = generateMockDocumentImage(type);
      setScannerImage(dataUrl);
      setScannerType(type);
      setScannerLoading(false);
      setScannerProgress('');
      setNotification(`✨ Sample ${type === 'passport' ? 'UAE Passport' : 'School Consent Slip'} generated!`);
    }, 400);
  };

  // Run the Multimodal AI Scanner utilizing google/gemini-3.5-flash via OpenRouter
  const handleRunMultimodalScan = async () => {
    if (!scannerImage) {
      setScannerError('Please select a sample template or upload a custom image.');
      return;
    }
    
    setScannerLoading(true);
    setScannerError(null);
    setScannerResult(null);
    
    // Multi-step progress updates for a rich iOS scanning experience
    const progressSteps = [
      "Establishing secure bridge to Gemini 3.5 Flash...",
      "Analyzing image visual layers & emblems...",
      "Extracting OCR characters & text arrays...",
      "Performing semantic data mapping...",
      "Parsing administrative parameters..."
    ];
    
    let currentStep = 0;
    setScannerProgress(progressSteps[0]);
    
    const progressTimer = setInterval(() => {
      currentStep++;
      if (currentStep < progressSteps.length) {
        setScannerProgress(progressSteps[currentStep]);
      }
    }, 1000);

    try {
      const systemPrompt = `You are an expert administrative intelligence specializing in document analysis.
You are helping a family parse images of their records (Passports, Consent Forms, IDs, etc.).
Extract all relevant information in structured raw JSON format. You must respond ONLY with valid JSON.
No markdown backticks, no markdown fences, no preamble, no commentary. Just raw JSON.

JSON schema structure:
{
  "documentType": "passport" | "consent_form" | "other",
  "extractedData": {
    "name": "Exact full name of document (e.g. UAE Passport, School Consent Slip)",
    "number": "Document/ID number if visible, or null",
    "expiryDate": "YYYY-MM-DD format (if passport/ID has expiry, or consent trip date)",
    "owner": "Ahmed | Sara | Yusuf | Layla | Family",
    "category": "Identity | Insurance | Education | Driving | Health | Finance"
  },
  "suggestedActions": [
    {
      "action": "Description of required follow-up task",
      "owner": "Ahmed | Sara | Yusuf | Layla | Family",
      "deadline": "YYYY-MM-DD format or null"
    }
  ],
  "summary": "Short 1-sentence administrative summary of what was scanned."
}
Ahmed and Sara are parents. Yusuf and Layla are children. Map owner names correctly.`;

      const userMessage = "Analyze this scanned document image and return the structured JSON data.";
      
      const rawText = await callAI(systemPrompt, userMessage, apiKey, scannerImage);
      clearInterval(progressTimer);
      
      const parsed = cleanAndParseJSON(rawText);
      setScannerResult(parsed);
      
      // Perform automated synchronization based on document type
      if (parsed.documentType === 'passport' || parsed.extractedData?.category === 'Identity') {
        const ext = parsed.extractedData;
        const newDoc = {
          id: `doc-scanned-${Date.now()}`,
          name: ext.name || 'UAE Passport',
          number: ext.number || 'N76251289',
          expiryDate: ext.expiryDate || '2026-10-28',
          owner: ext.owner || 'Ahmed',
          category: ext.category || 'Identity',
          progress: 100
        };
        
        if (token) {
          fetch('/api/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newDoc)
          }).catch(err => console.error("Error saving scanned document to SQLite:", err));
        }
        
        setDocuments(prev => {
          if (prev.some(d => d.number === newDoc.number)) return prev;
          return [newDoc, ...prev];
        });
        
        setNotification(`✨ Added ${newDoc.name} (${newDoc.owner}) to Document Vault!`);
      } else if (parsed.documentType === 'consent_form' || parsed.suggestedActions?.length > 0) {
        const newActions = parsed.suggestedActions.map((act, idx) => {
          let assigned = act.owner || 'Family';
          if (assigned === 'Parent 1') assigned = 'Ahmed';
          if (assigned === 'Parent 2') assigned = 'Sara';
          
          let urgency = 'low';
          if (act.deadline) {
            const diff = getDaysDifference(act.deadline, REFERENCE_DATE);
            if (diff <= 3) urgency = 'high';
            else if (diff <= 7) urgency = 'medium';
          }
          
          return {
            id: `action-scanned-${Date.now()}-${idx}`,
            type: 'scanned-action',
            title: act.action,
            subtitle: `Scanned from Document • Due: ${act.deadline || 'No deadline'}`,
            owner: assigned,
            category: parsed.extractedData?.category || 'Education',
            urgency: urgency,
            date: act.deadline || REFERENCE_DATE,
            icon: parsed.documentType === 'consent_form' ? '📝' : '📄'
          };
        });
        
        if (token) {
          newActions.forEach(task => {
            fetch('/api/tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                id: task.id,
                title: task.title,
                assignee: task.owner,
                dueDate: task.date,
                completed: false,
                category: task.category
              })
            }).catch(err => console.error("Error saving scanned task to SQLite:", err));
          });
        }
        
        setCustomScannedActions(prev => [...newActions, ...prev]);
        setNotification(`✨ Added ${newActions.length} items to Action Checklist!`);
      } else {
        setNotification('✨ Scanned successfully!');
      }
      
    } catch (err) {
      clearInterval(progressTimer);
      console.error(err);
      setScannerError(`AI Scanning Failed: ${err.message}. Ensure your OpenRouter connection is active.`);
    } finally {
      setScannerLoading(false);
    }
  };

  // Settings
  const handleSaveSettings = () => {
    localStorage.setItem('openrouter_api_key', tempKey);
    setApiKey(tempKey);
    setShowSettings(false);
    setNotification('Settings saved!');
  };

  // Add Document
  const handleAddDocument = (e) => {
    e.preventDefault();
    if (!newDocData.name || !newDocData.expiryDate) {
      alert('Please fill in Name and Expiry Date.');
      return;
    }
    const diffDays = getDaysDifference(newDocData.expiryDate, REFERENCE_DATE);
    const newDoc = {
      ...newDocData,
      id: `doc-${Date.now()}`,
      progress: diffDays < 0 ? 0 : diffDays <= 90 ? Math.round((diffDays / 90) * 100) : 100
    };
    if (token) {
      fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newDoc)
      }).catch(err => console.error("Error saving document to SQLite:", err));
    }
    setDocuments(prev => [...prev, newDoc]);
    setShowAddDocModal(false);
    setNewDocData({
      name: '',
      number: '',
      expiryDate: '',
      owner: 'Ahmed',
      category: 'Identity',
      progress: 100
    });
    setNotification('Document added!');
  };

  // Delete Document
  const handleDeleteDocument = (id) => {
    if (confirm('Are you sure you want to remove this document?')) {
      if (token) {
        fetch(`/api/documents/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => console.error("Error deleting document from SQLite:", err));
      }
      setDocuments(prev => prev.filter(d => d.id !== id));
      setSelectedDoc(null);
      setNotification('Document deleted.');
    }
  };

  // Sorting
  const sortedDocuments = [...documents].sort((a, b) => {
    const statusA = getDocumentStatus(a.expiryDate);
    const statusB = getDocumentStatus(b.expiryDate);
    if (statusA.urgency !== statusB.urgency) {
      return statusA.urgency - statusB.urgency; 
    }
    return parseDate(a.expiryDate).getTime() - parseDate(b.expiryDate).getTime();
  });

  // Filters
  const filteredDocuments = sortedDocuments.filter(doc => {
    const status = getDocumentStatus(doc.expiryDate);
    if (docMemberFilter !== 'all' && doc.owner !== docMemberFilter) return false;
    if (docFilter === 'expired' && status.urgency !== 0) return false;
    if (docFilter === 'expiring' && status.urgency !== 1) return false;
    if (docFilter === 'valid' && status.urgency !== 2) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.number && doc.number.toLowerCase().includes(q)) ||
        doc.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEmails = emails.filter(email => {
    if (emailFilter === 'unread' && email.read) return false;
    if (emailFilter === 'read' && !email.read) return false;

    if (emailSearchQuery) {
      const q = emailSearchQuery.toLowerCase();
      return (
        email.from.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q) ||
        email.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ========================================================
  // DYNAMIC ACTIONS MERGER & AGGREGATOR (Tab 3 Consolidated)
  // ========================================================
  const dynamicActions = (() => {
    const list = [];

    // A. Add expired and expiring documents as critical/warning actions
    documents.forEach(doc => {
      const status = getDocumentStatus(doc.expiryDate);
      if (status.urgency !== 2) {
        list.push({
          id: `action-doc-${doc.id}`,
          type: 'document',
          title: `${doc.owner}: ${doc.name} renewal`,
          subtitle: status.urgency === 0 ? `Expired on ${doc.expiryDate}` : `Expires in ${getDaysDifference(doc.expiryDate, REFERENCE_DATE)} days (${doc.expiryDate})`,
          owner: doc.owner,
          category: doc.category,
          urgency: status.urgency === 0 ? 'high' : 'medium',
          date: doc.expiryDate,
          icon: doc.category === 'Identity' ? '🛂' : doc.category === 'Driving' ? '🚗' : doc.category === 'Health' ? '🩺' : doc.category === 'Education' ? '🎓' : '📄',
          rawDoc: doc
        });
      }
    });

    // B. Extract actions and deadlines from parsed emails in state
    Object.entries(analysisResults).forEach(([emailId, results]) => {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      if (results.actionItems) {
        results.actionItems.forEach((act, idx) => {
          // Map dynamic owner naming
          let assigned = 'Family';
          if (act.owner === 'Ahmed' || act.owner === 'Parent 1') assigned = 'Ahmed';
          else if (act.owner === 'Sara' || act.owner === 'Parent 2') assigned = 'Sara';
          else if (act.owner === 'Both') assigned = 'Family';

          // Urgency math from deadline
          let urgency = 'low';
          if (act.deadline) {
            const diff = getDaysDifference(act.deadline, REFERENCE_DATE);
            if (diff <= 3) urgency = 'high';
            else if (diff <= 7) urgency = 'medium';
          }

          list.push({
            id: `action-email-${emailId}-${idx}`,
            type: 'email-action',
            title: act.action,
            subtitle: `Due: ${act.deadline || 'No deadline'}`,
            owner: assigned,
            category: email.category,
            urgency: urgency,
            date: act.deadline || REFERENCE_DATE,
            icon: email.icon,
            emailSubject: email.subject
          });
        });
      }
    });

    // C. Add custom scanned actions
    customScannedActions.forEach(act => {
      list.push(act);
    });

    // Filter by Assignee Segmented control
    return list.filter(item => {
      if (actionAssigneeFilter === 'all') return true;
      return item.owner === actionAssigneeFilter;
    });
  })();

  const getEmailAvatarConfig = (email) => {
    switch (email.icon) {
      case '🏫': return { icon: 'school', color: 'bg-[#e0f2fe] text-[#0369a1]' }; // blue-100
      case '⚽': return { icon: 'sports_soccer', color: 'bg-[#dcfce7] text-[#15803d]' }; // green-100
      case '🩺': return { icon: 'medical_services', color: 'bg-[#fee2e2] text-[#b91c1c]' }; // red-100
      case '✈️': return { icon: 'flight_takeoff', color: 'bg-[#e0e7ff] text-[#4338ca]' }; // indigo-100
      case '🛡️': return { icon: 'security', color: 'bg-[#ecfeff] text-[#0e7490]' }; // cyan-100
      case '💵': return { icon: 'payments', color: 'bg-[#fef3c7] text-[#b45309]' }; // amber-100
      case '🛂': return { icon: 'description', color: 'bg-[#e0f2fe] text-[#0369a1]' }; // blue-100
      case '🏕️': return { icon: 'wb_sunny', color: 'bg-[#ffedd5] text-[#c2410c]' }; // orange-100
      case '🦷': return { icon: 'dentistry', color: 'bg-[#fff1f2] text-[#be123c]' }; // rose-100
      case '⛺': return { icon: 'map', color: 'bg-[#dcfce7] text-[#15803d]' }; // green-100
      case '🚗': return { icon: 'directions_car', color: 'bg-[#f1f5f9] text-[#475569]' }; // slate-100
      case '🏊': return { icon: 'pool', color: 'bg-[#e0f2fe] text-[#0284c7]' }; // sky-100
      case '🧸': return { icon: 'child_care', color: 'bg-[#fce7f3] text-[#be185d]' }; // pink-100
      case '🇬🇧': return { icon: 'account_balance', color: 'bg-[#f1f5f9] text-[#475569]' }; // slate-100
      case '📝': return { icon: 'campaign', color: 'bg-[#fef9c3] text-[#a16207]' }; // yellow-100
      default: return { icon: 'mail', color: 'bg-stone-100 text-stone-600' };
    }
  };

  const toggleActionComplete = (actionId) => {
    const isComplete = completedActionIds.includes(actionId);
    const nextCompletedState = !isComplete;

    if (token) {
      const matchedAction = dynamicActions.find(a => a.id === actionId);
      const taskBody = {
        id: actionId,
        title: matchedAction?.title || 'Sync Task',
        assignee: matchedAction?.owner || 'Family',
        dueDate: matchedAction?.date || '',
        completed: nextCompletedState,
        category: matchedAction?.category || 'Sync'
      };

      fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskBody)
      }).catch(err => console.error("Error syncing task state to SQLite:", err));
    }

    setCompletedActionIds(prev => {
      const updated = isComplete ? prev.filter(id => id !== actionId) : [...prev, actionId];
      if (!isComplete) {
        setNotification('✨ Task completed!');
      }
      return updated;
    });
  };

  const expiredDocs = filteredDocuments.filter(d => getDocumentStatus(d.expiryDate).urgency === 0);
  const expiringSoonDocs = filteredDocuments.filter(d => getDocumentStatus(d.expiryDate).urgency === 1);
  const validDocs = filteredDocuments.filter(d => getDocumentStatus(d.expiryDate).urgency === 2);

  const criticalActions = dynamicActions.filter(a => a.urgency === 'high');
  const warningActions = dynamicActions.filter(a => a.urgency === 'medium');
  const taskActions = dynamicActions.filter(a => a.urgency === 'low');

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-6 transition-all duration-300 antialiased relative overflow-hidden select-none">
      
      {/* 🔮 Ambient 3D Radial Blur Background Circles */}
      <div className="ambient-glow-wrapper">
        <div className="ambient-glow-circle-1"></div>
        <div className="ambient-glow-circle-2"></div>
      </div>
      
      {/* 📱 Simulated Premium iOS Mobile Shell (Frameless, Weightless, Floating Glass) */}
      <div className="relative w-full max-w-[420px] h-screen sm:h-[840px] sm:rounded-[40px] bg-[#fff8f1] backdrop-blur-xl border border-stone-200/50 shadow-premium-lg sm:overflow-hidden flex flex-col transition-all duration-500 z-10 text-[#1e1b15]">
        
        {/* Sleek iOS Top Status Bar (Transparent & Weightless) */}
        <div className="hidden sm:flex absolute top-0 left-0 right-0 h-10 px-8 items-center justify-between text-[11px] font-bold text-stone-500 z-50 pointer-events-none select-none">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="tracking-widest">5G</span>
            {/* Battery Icon */}
            <div className="w-5.5 h-3 border border-stone-400 rounded-[4px] p-[1px] flex items-center">
              <div className="w-full h-full bg-stone-500 rounded-[2px]"></div>
            </div>
          </div>
        </div>

        {/* 🔔 Premium Sticky Toast Notification */}
        {notification && (
          <div className="absolute top-16 left-4 right-4 z-55 animate-bounce">
            <div className="glass-card shadow-premium-lg border border-white/60 rounded-[24px] p-3.5 px-5 flex items-center gap-3 bg-[#fff8f1]/80 backdrop-blur-md">
              <span className="text-xl">✨</span>
              <p className="text-xs font-semibold text-stone-850 leading-tight">{notification}</p>
            </div>
          </div>
        )}
        {!token || !user ? (
          <Lockscreen 
            onLogin={(jwtToken, loggedUser) => {
              localStorage.setItem('family_jwt_token', jwtToken);
              setToken(jwtToken);
              setUser(loggedUser);
              setNotification('Welcome back!');
            }}
          />
        ) : (
          <>
            {/* CONDITIONAL RENDER: 1. FULL SCREEN SETTINGS */}
            {showSettings ? (
          <div className="flex-1 flex flex-col h-full bg-[#fff8f1] animate-scale-up z-40 overflow-hidden">
            {/* Settings Header App Bar */}
            <header className="sticky top-0 bg-[#fff8f1]/80 backdrop-blur-md h-16 flex justify-between items-center px-6 border-b border-outline-variant/10 shrink-0 z-30 pt-0 sm:pt-4">
              <button 
                onClick={() => {
                  setTempKey(apiKey);
                  setShowSettings(false);
                }}
                className="flex items-center gap-1.5 text-on-surface-variant hover:opacity-85 transition-opacity active:scale-95 duration-200"
              >
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>arrow_back</span>
                <span className="font-label-sm text-[12px] font-semibold text-primary">Back</span>
              </button>
              <h1 className="font-headline-md-mobile text-[16px] font-semibold text-primary">Settings</h1>
              <div className="w-10"></div> {/* Spacer for perfect centering */}
            </header>

            {/* Scrollable Settings Panel */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 text-left pb-24">
              <div>
                <h2 className="font-headline-lg-mobile text-[28px] font-semibold text-primary leading-tight">Configuration</h2>
                <p className="font-body-md text-[14px] text-on-surface-variant mt-2 leading-relaxed">
                  Manage your AI connection and privacy preferences for the Family AI ecosystem.
                </p>
              </div>

              {/* Main Configuration Card */}
              <div className="bg-white rounded-2xl p-6 border border-outline-variant/20 shadow-sm flex flex-col gap-5">
                
                {/* Connection Status Widget */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider block">AI Provider</span>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-750 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Connected
                    </span>
                  </div>
                  
                  <div className="bg-[#fff8f1] border border-outline-variant/20 rounded-xl p-4 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-label-md text-primary font-bold text-[13.5px]">OpenRouter AI</h4>
                      <p className="text-[11.5px] text-on-surface-variant mt-0.5 leading-relaxed">
                        Running on local environment configuration. Keys are securely locked inside backend environment context.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Masked Key Display */}
                <div className="space-y-2">
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider block">Active Credentials</label>
                  <div className="w-full bg-[#fff8f1] border border-outline-variant/20 rounded-xl py-3 px-4 text-xs font-mono text-stone-600 flex justify-between items-center select-none">
                    <span>sk-or-v1-••••••••••••••••••••••••</span>
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
                  </div>
                </div>

                {/* Active Model Identifier */}
                <div className="space-y-2">
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider block">Active Model</label>
                  <div className="w-full bg-[#fff8f1] border border-outline-variant/20 rounded-xl py-3.5 px-4 text-xs font-medium text-primary/80 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[16px]">psychology</span>
                    <span>google/gemini-3.5-flash</span>
                  </div>
                </div>

                {/* Info Advisory */}
                <div className="flex items-start gap-2.5 text-on-surface-variant/80 border-t border-outline-variant/10 pt-4 mt-1 text-[11px] leading-relaxed">
                  <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5">lock</span>
                  <p>
                    Local configuration decoupled. Manual API input has been disabled to prevent exposed secrets. AI services are processed securely.
                  </p>
                </div>

              </div>

              {/* Family AI Assistant Logo Card */}
              <div className="bg-[#f5ede3] rounded-2xl p-4.5 border border-outline-variant/10 flex items-center justify-between cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#181512] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[22px]">family_history</span>
                  </div>
                  <div>
                    <h4 className="font-label-md font-bold text-[14px] text-primary">Family AI Assistant</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">POC v0.1</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>

              {/* Action List Section */}
              <div className="space-y-1">
                <button 
                  onClick={() => window.open('https://google.com', '_blank')}
                  className="w-full bg-white hover:bg-stone-50 py-3.5 px-4.5 rounded-xl border border-outline-variant/10 flex items-center justify-between transition-colors text-primary font-medium text-[13px] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>
                    <span>Privacy Policy</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">open_in_new</span>
                </button>
                <button 
                  onClick={() => window.open('https://google.com', '_blank')}
                  className="w-full bg-white hover:bg-stone-50 py-3.5 px-4.5 rounded-xl border border-outline-variant/10 flex items-center justify-between transition-colors text-primary font-medium text-[13px] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">help</span>
                    <span>Documentation</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">open_in_new</span>
                </button>

                <button 
                  onClick={() => {
                    localStorage.removeItem('family_jwt_token');
                    setToken('');
                    setUser(null);
                    setShowSettings(false);
                    setNotification('Signed out successfully.');
                  }}
                  className="w-full bg-white hover:bg-stone-50 py-3.5 px-4.5 rounded-xl border border-outline-variant/10 flex items-center justify-between transition-colors text-primary font-medium text-[13px] cursor-pointer mb-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                </button>

                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all data? This will reset the application to its starting state.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-white hover:bg-rose-50 py-3.5 px-4.5 rounded-xl border border-outline-variant/10 flex items-center justify-between transition-colors text-error font-medium text-[13px] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error text-[18px]">delete</span>
                    <span>Reset App Data</span>
                  </div>
                  <span className="material-symbols-outlined text-error text-[18px]">chevron_right</span>
                </button>
              </div>

            </div>

            {/* Bottom Nav Bar (Simulated inactive state on settings) */}
            <nav className="absolute bottom-0 left-0 right-0 bg-[#fff8f1]/80 backdrop-blur-xl border-t border-outline-variant/20 py-3.5 pb-8 flex justify-around items-center shrink-0 z-30 shadow-lg rounded-t-2xl">
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-85 transition-all duration-200 cursor-pointer active:scale-95" onClick={() => { setShowSettings(false); setActiveTab('documents'); }}>
                <span className="material-symbols-outlined text-[22px]">description</span>
                <span className="font-label-sm text-[12px] mt-1">Documents</span>
              </div>
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-85 transition-all duration-200 cursor-pointer active:scale-95" onClick={() => { setShowSettings(false); setActiveTab('inbox'); }}>
                <span className="material-symbols-outlined text-[22px]">mail</span>
                <span className="font-label-sm text-[12px] mt-1">Inbox</span>
              </div>
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-85 transition-all duration-200 cursor-pointer active:scale-95" onClick={() => { setShowSettings(false); setActiveTab('actions'); }}>
                <span className="material-symbols-outlined text-[22px]">format_list_bulleted</span>
                <span className="font-label-sm text-[12px] mt-1">Action List</span>
              </div>
            </nav>
          </div>
        ) : activeEmail ? (
          /* CONDITIONAL RENDER: 2. FULL SCREEN EMAIL ANALYSES DETAILED VIEW */
          <div className="flex-1 flex flex-col h-full bg-[#fff8f1] animate-scale-up z-40 overflow-hidden text-left">
            {/* Email View Header */}
            <header className="sticky top-0 bg-[#fff8f1]/80 backdrop-blur-md h-16 flex justify-between items-center px-6 border-b border-outline-variant/10 shrink-0 z-30 pt-0 sm:pt-4">
              <button 
                onClick={() => {
                  setActiveEmail(null);
                  setAiError(null);
                }}
                className="flex items-center gap-1.5 text-on-surface-variant hover:opacity-85 transition-opacity active:scale-95 duration-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">arrow_back</span>
                <span className="font-label-sm text-[12px] font-semibold text-primary">Back to Inbox</span>
              </button>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">more_vert</span>
            </header>

            {/* Scrollable Email Content Canvas */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-28">
              
              {/* Original Email Snippet Box */}
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 text-left shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-headline-md text-[20px] font-bold text-primary leading-snug">{activeEmail.subject}</h2>
                    <p className="font-label-md text-[13px] text-on-surface-variant mt-1.5">
                      From: {activeEmail.from.split(' <')[0]} • {activeEmail.date}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">attach_file</span>
                </div>
                <div className="text-on-surface-variant text-[13px] italic opacity-85 border-t border-outline-variant/20 pt-2.5 leading-relaxed">
                  "{activeEmail.body}"
                </div>
              </div>

              {/* AI Extraction Layer Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[16px]">auto_awesome</span>
                    AI Extraction Layer
                  </h3>
                  
                  {!analysisResults[activeEmail.id] && !aiLoading && (
                    <button 
                      onClick={() => handleAnalyzeEmail(activeEmail.id)}
                      className="bg-primary text-on-primary font-label-md text-[11.5px] py-1.5 px-4 rounded-full flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      Analyse with AI
                    </button>
                  )}
                </div>

                {/* AI Loading state */}
                {aiLoading && (
                  <div className="bg-surface-container-lowest rounded-2xl p-8 border border-secondary/15 shadow-[0px_4px_20px_rgba(45,41,38,0.04)] flex flex-col items-center justify-center gap-4 text-center animate-pulse py-12">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-4 border-secondary/20"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-secondary animate-spin"></div>
                    </div>
                    <div>
                      <p className="font-headline-md text-[16px] font-bold text-secondary">AI is thinking...</p>
                      <p className="font-label-md text-[12px] text-on-surface-variant mt-1">Extracting events and key tasks for your family</p>
                    </div>
                  </div>
                )}

                {/* AI Error state */}
                {aiError && (
                  <div className="bg-error-container text-on-error-container rounded-2xl p-4.5 border border-error/20 text-left space-y-2">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      Analysis Failed
                    </p>
                    <p className="text-[11.5px] leading-relaxed opacity-90">{aiError}</p>
                    <button
                      onClick={() => handleAnalyzeEmail(activeEmail.id)}
                      className="text-[10px] bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold text-white transition-colors active:scale-95 cursor-pointer"
                    >
                      Retry Analysis
                    </button>
                  </div>
                )}

                {/* AI Finished Result presentation */}
                {analysisResults[activeEmail.id] && !aiLoading && (
                  <div className="space-y-4 animate-scale-up">
                    
                    {/* Summary Result Card */}
                    <div className="bg-surface-container-lowest rounded-[24px] p-5 shadow-[0px_4px_20px_rgba(45,41,38,0.04)] border border-secondary/10 flex flex-col gap-4 relative overflow-hidden text-left">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary/40 via-secondary to-secondary/40"></div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="font-label-sm text-[11px] text-secondary uppercase tracking-widest font-semibold">AI Intelligent Summary</span>
                      </div>

                      <div className="bg-secondary/5 p-4 rounded-xl border-l-4 border-secondary">
                        <p className="font-body-lg text-[14px] text-primary leading-relaxed">
                          {analysisResults[activeEmail.id].summary}
                        </p>
                      </div>

                      {/* Scheduled Events */}
                      {analysisResults[activeEmail.id].events && analysisResults[activeEmail.id].events.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                            <span className="font-label-sm text-[10px] uppercase font-bold tracking-wider opacity-60">Events & Dates Detected</span>
                          </div>
                          <div className="space-y-2">
                            {analysisResults[activeEmail.id].events.map((evt, idx) => (
                              <div key={idx} className="bg-surface-container rounded-xl p-4 flex items-center justify-between">
                                <div className="text-left pr-2">
                                  <p className="font-headline-md text-primary font-bold text-[13px]">{evt.description}</p>
                                  <p className="font-label-sm text-on-surface-variant text-[11px] mt-0.5">Main Event</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-secondary font-bold text-[12px]">{evt.date}</p>
                                  <p className="text-[10px] text-on-surface-variant mt-0.5">All Day</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Items Checklist */}
                      {analysisResults[activeEmail.id].actionItems && analysisResults[activeEmail.id].actionItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                            <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                            <span className="font-label-sm text-[10px] uppercase font-bold tracking-wider opacity-60">Action Items</span>
                          </div>
                          <div className="space-y-2">
                            {analysisResults[activeEmail.id].actionItems.map((act, idx) => {
                              const actionId = `action-email-${activeEmail.id}-${idx}`;
                              const isComplete = completedActionIds.includes(actionId);
                              const assigned = act.owner === 'Parent 1' ? 'Ahmed' : act.owner === 'Parent 2' ? 'Sara' : 'Family';
                              const member = FAMILY_MEMBERS[assigned] || FAMILY_MEMBERS.Family;

                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => toggleActionComplete(actionId)}
                                  className={`bg-surface-container-low/50 rounded-xl p-4 flex items-center gap-3 border border-outline-variant/10 cursor-pointer hover:bg-surface-container-low transition-colors duration-150 ${isComplete ? 'opacity-55' : ''}`}
                                >
                                  <button 
                                    type="button"
                                    className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${isComplete ? 'bg-secondary border-secondary shadow-xs' : 'border-stone-300 bg-white'}`}
                                  >
                                    {isComplete && (
                                      <svg className="w-3.5 h-3.5 fill-none stroke-current text-white stroke-3" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </button>
                                  <div className="flex-grow text-left min-w-0">
                                    <p className={`text-[12px] font-medium leading-normal ${isComplete ? 'line-through text-stone-400' : 'text-primary font-bold'}`}>
                                      {act.action}
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant mt-1.5 flex items-center gap-1.5 font-bold">
                                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${member.color}`}>
                                        {member.initials}
                                      </span>
                                      <span>{assigned} {act.deadline ? `• Due: ${act.deadline}` : ''}</span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Documents Needed triggers */}
                      {analysisResults[activeEmail.id].documentsNeeded && analysisResults[activeEmail.id].documentsNeeded.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            <span className="font-label-sm text-[10px] uppercase font-bold tracking-wider opacity-60">Documents Needed</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {analysisResults[activeEmail.id].documentsNeeded.map((docName, idx) => (
                              <div 
                                key={idx}
                                onClick={() => {
                                  setScannerResult(null);
                                  setScannerError(null);
                                  setScannerImage(null);
                                  setScannerType(null);
                                  setShowScanner(true);
                                  
                                  const name = docName.toLowerCase();
                                  if (name.includes('passport')) {
                                    handleSelectSampleDocument('passport');
                                  } else if (name.includes('consent') || name.includes('permission') || name.includes('form') || name.includes('slip') || name.includes('trip')) {
                                    handleSelectSampleDocument('consent');
                                  }
                                }}
                                className="bg-white border border-dashed border-outline-variant/30 rounded-xl p-4 flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-[#f5ede3] flex items-center justify-center text-primary/80">
                                    <span className="material-symbols-outlined text-[18px]">attachment</span>
                                  </div>
                                  <div className="text-left">
                                    <p className="font-label-md text-[12px] font-bold text-primary">{docName}</p>
                                    <p className="text-[10px] text-secondary font-semibold mt-0.5">Scan &amp; Upload</p>
                                  </div>
                                </div>
                                <span className="material-symbols-outlined text-secondary text-[20px]">cloud_upload</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reply Draft copy block */}
                      {analysisResults[activeEmail.id].needsReply && analysisResults[activeEmail.id].draftReply && (
                        <div className="bg-surface-container-low p-4 rounded-xl space-y-2 border border-outline-variant/20 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">AI Generated Draft Reply</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(analysisResults[activeEmail.id].draftReply);
                                setNotification('Reply copied to clipboard!');
                              }}
                              className="text-[11px] font-extrabold text-secondary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              Copy Draft
                            </button>
                          </div>
                          <div className="text-[12px] text-stone-700 bg-white p-3 rounded-lg border border-outline-variant/10 whitespace-pre-line leading-relaxed italic">
                            {analysisResults[activeEmail.id].draftReply}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 mt-2">
                        <button 
                          onClick={() => {
                            setNotification('📅 Event synced to your Apple Calendar!');
                          }}
                          className="bg-primary text-on-primary py-3.5 px-6 rounded-xl font-label-md text-[13px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer shadow-md"
                        >
                          <span className="material-symbols-outlined text-[18px]">event</span>
                          Add to Calendar
                        </button>
                        <button 
                          onClick={() => handleAnalyzeEmail(activeEmail.id)}
                          className="bg-surface-container-high text-primary py-3.5 px-6 rounded-xl font-label-md text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">refresh</span>
                          Re-analyze Email
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Nav Bar (Simulated inactive state on email detail) */}
            <nav className="absolute bottom-0 left-0 right-0 bg-[#fff8f1]/80 backdrop-blur-xl border-t border-outline-variant/20 py-3.5 pb-8 flex justify-around items-center shrink-0 z-30 shadow-lg rounded-t-2xl">
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-85 transition-all duration-200 cursor-pointer active:scale-95" onClick={() => { setActiveEmail(null); setActiveTab('documents'); }}>
                <span className="material-symbols-outlined text-[22px]">description</span>
                <span className="font-label-sm text-[12px] mt-1">Documents</span>
              </div>
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-85 transition-all duration-200 cursor-pointer active:scale-95" onClick={() => { setActiveEmail(null); setActiveTab('inbox'); }}>
                <span className="material-symbols-outlined text-[22px]">mail</span>
                <span className="font-label-sm text-[12px] mt-1">Inbox</span>
              </div>
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-85 transition-all duration-200 cursor-pointer active:scale-95" onClick={() => { setActiveEmail(null); setActiveTab('actions'); }}>
                <span className="material-symbols-outlined text-[22px]">format_list_bulleted</span>
                <span className="font-label-sm text-[12px] mt-1">Action List</span>
              </div>
            </nav>
          </div>
        ) : (
          /* CONDITIONAL RENDER: 3. STANDARD TAB VIEWS (DOCUMENTS, INBOX, ACTION LIST) */
          <>
            {/* 🎩 iOS Sticky Top App Bar */}
            <header className="bg-[#fff8f1]/85 backdrop-blur-md sticky top-0 w-full z-30 flex justify-between items-center px-6 h-16 shrink-0 border-b border-outline-variant/10 pt-0 sm:pt-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[24px]">family_history</span>
                <h1 className="font-headline-md text-[18px] font-semibold text-primary">Family AI</h1>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={() => setShowSettings(true)} 
                  className="hover:bg-surface-container-low transition-colors p-2 rounded-full active:scale-95 duration-200 cursor-pointer"
                  title="Settings"
                >
                  <span className="material-symbols-outlined text-primary text-[22px]">settings</span>
                </button>
              </div>
            </header>

            {/* 📂 Scrollable main content canvas */}
            <main className="flex-1 overflow-y-auto no-scrollbar pb-28 p-6 space-y-6">
              
              {/* TAB 1: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Greetings Header Section */}
                  <section className="text-left">
                    <div className="flex flex-col gap-1">
                      <span className="font-label-md text-on-surface-variant text-[13px] font-semibold uppercase tracking-wider">
                        The {user?.familyName || user?.family_name || 'Hassan'} Family
                      </span>
                      <h2 className="font-headline-lg-mobile text-[28px] font-bold text-primary leading-none mt-1">Document Vault</h2>
                      <p className="font-label-sm text-outline text-[11.5px] font-bold mt-1.5">
                        May 19, 2026 • {documents.length} active documents tracked
                      </p>
                    </div>

                    {/* AI Alert Scan Button */}
                    <button 
                      onClick={handleRunDocScan}
                      className="mt-5 w-full py-4 px-5 rounded-2xl bg-secondary-container text-on-secondary-fixed flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer shadow-sm border border-secondary-container/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px] ai-pulse-glow" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="font-label-md text-[13px] font-bold">Run AI Alert Scan</span>
                      </div>
                      <span className="font-label-sm text-[11px] opacity-75 font-semibold">
                        {docScanState === 'idle' ? 'Detecting expirations...' : docScanState === 'scanning' ? 'Scanning Family Cloud...' : '3 New Actions Found'}
                      </span>
                    </button>
                  </section>

                  {/* Profile Bubbles Filter */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Family Members</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                      <button 
                        onClick={() => setDocMemberFilter('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer ${docMemberFilter === 'all' ? 'bg-[#181512] text-white border-[#181512] shadow-sm' : 'bg-white/60 border-outline-variant/30 text-stone-600 hover:bg-stone-50'}`}
                      >
                        <span>All ({documents.length})</span>
                      </button>
                      {Object.values(FAMILY_MEMBERS).map(member => {
                        const count = documents.filter(d => d.owner === member.name).length;
                        const isSelected = docMemberFilter === member.name;
                        return (
                          <button 
                            key={member.name}
                            onClick={() => setDocMemberFilter(member.name)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer ${isSelected ? 'bg-[#181512] text-white border-[#181512] shadow-sm' : 'bg-white/60 border-outline-variant/30 text-stone-600 hover:bg-stone-50'}`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${isSelected ? 'bg-white text-stone-900 shadow-3xs' : member.color}`}>
                              {member.initials}
                            </span>
                            <span>{member.name} ({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual add & Search */}
                  <div className="bg-white/50 backdrop-blur-md rounded-[24px] p-3 border border-outline-variant/30 shadow-premium space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search vault..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white/60 border border-outline-variant/30 rounded-xl py-2 pl-9 pr-4 text-[12px] focus:outline-none focus:border-stone-400 focus:bg-white transition-all text-primary"
                        />
                        <span className="absolute left-3 top-2 text-stone-400 text-[14px] material-symbols-outlined">search</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setScannerResult(null);
                          setScannerError(null);
                          setScannerImage(null);
                          setScannerType(null);
                          setShowScanner(true);
                        }}
                        className="bg-secondary text-white py-2 px-3.5 rounded-xl font-label-md text-[12px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px] animate-pulse-gentle">document_scanner</span>
                        AI Scanner
                      </button>

                      <button
                        onClick={() => setShowAddDocModal(true)}
                        className="bg-primary text-on-primary py-2 px-3.5 rounded-xl font-label-md text-[12px] font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-xs shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Document Groups */}
                  <div className="space-y-6">
                    {filteredDocuments.length === 0 ? (
                      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-10 border border-outline-variant/30 text-center text-stone-400 shadow-sm text-left">
                        <span className="text-2xl block mb-2">🗂️</span>
                        <p className="text-xs font-bold">No matching documents found.</p>
                      </div>
                    ) : (
                      <>
                        {/* 1. EXPIRED (URGENT) */}
                        {expiredDocs.length > 0 && (
                          <div className="flex flex-col gap-3 text-left">
                            <h3 className="font-label-sm text-error uppercase tracking-widest flex items-center gap-1 text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">warning</span>
                              Expired
                            </h3>
                            <div className="space-y-3">
                              {expiredDocs.map(doc => (
                                <div 
                                  key={doc.id}
                                  onClick={() => setSelectedDoc(doc)}
                                  className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(45,41,38,0.04)] border-l-4 border-error hover:scale-[1.01] transition-all cursor-pointer flex justify-between items-start"
                                >
                                  <div>
                                    <p className="font-label-sm text-on-surface-variant text-[11px] font-semibold">{doc.owner}</p>
                                    <h4 className="font-headline-md text-primary text-[16px] font-bold mt-1">{doc.name}</h4>
                                    <p className="font-label-sm text-error text-[12px] font-bold mt-2">Expired: {doc.expiryDate}</p>
                                  </div>
                                  <div className="bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-[11px] font-bold shrink-0 shadow-3xs">
                                    Overdue
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. EXPIRING SOON */}
                        {expiringSoonDocs.length > 0 && (
                          <div className="flex flex-col gap-3 text-left">
                            <h3 className="font-label-sm text-secondary uppercase tracking-widest flex items-center gap-1 text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              Expiring Soon
                            </h3>
                            <div className="space-y-3">
                              {expiringSoonDocs.map(doc => (
                                <div 
                                  key={doc.id}
                                  onClick={() => setSelectedDoc(doc)}
                                  className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(45,41,38,0.04)] border-l-4 border-secondary-container hover:scale-[1.01] transition-all cursor-pointer flex justify-between items-start"
                                >
                                  <div>
                                    <p className="font-label-sm text-on-surface-variant text-[11px] font-semibold">{doc.owner}</p>
                                    <h4 className="font-headline-md text-primary text-[16px] font-bold mt-1">{doc.name}</h4>
                                    <p className="font-label-sm text-secondary text-[12px] font-bold mt-2">Ends: {doc.expiryDate}</p>
                                  </div>
                                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">notifications</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. VALID */}
                        {validDocs.length > 0 && (
                          <div className="flex flex-col gap-3 text-left">
                            <h3 className="font-label-sm text-outline uppercase tracking-widest flex items-center gap-1 text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              Valid
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              {validDocs.map(doc => (
                                <div 
                                  key={doc.id}
                                  onClick={() => setSelectedDoc(doc)}
                                  className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between h-28 text-left"
                                >
                                  <div>
                                    <p className="font-label-sm text-on-surface-variant text-[11px] font-semibold">{doc.owner}</p>
                                    <h4 className="font-label-md text-primary text-[14px] font-bold truncate mt-1">{doc.name}</h4>
                                  </div>
                                  <div className="mt-3 flex items-center gap-1.5 shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                                    <p className="font-label-sm text-outline text-[11px] font-bold">{doc.expiryDate}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Featured security graphic block */}
                    <div 
                      onClick={() => setShowAddDocModal(true)}
                      className="mt-8 rounded-3xl overflow-hidden relative h-48 group shadow-md cursor-pointer border border-[#efe7dd]/45"
                    >
                      <img 
                        alt="Secure Documents" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDkLg30uWNJcRZRfTpVJdFnbrorCBxIefm8A3CWK0264PkbcQbjRlxQuLO2_z0ZrVocaDlHarj7P_0_y1tdqu4nNJo-ew-8OPhMA5vbQFAyIq9GvdU0DfudIMNituXGtE-_5xY4WwGiMyMO3jIc7i79NplVxv6edt7Vo4OsiNNyx_Hu0Oq3AsEstyRjGaiAq5UUholFFAWralXVV6qCAg5RQ987TUIHzMK-Ox6Vrx_SehKFNppTySB-DAfA5jwHRDReF_QjdSPKpo"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/25 to-transparent flex flex-col justify-end p-5 text-left">
                        <p className="text-white font-headline-md text-[18px] font-bold leading-tight">Protect what matters.</p>
                        <p className="text-white/80 font-label-sm text-[11.5px] mt-0.5">Encrypted, offline-first vault access enabled.</p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: INBOX */}
              {activeTab === 'inbox' && (
                <div className="space-y-6">
                  {/* AI Scan Header Section */}
                  <section className="text-left">
                    <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/30 flex flex-col gap-3 shadow-sm text-left">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary ai-pulse text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="font-label-sm text-[10px] text-secondary uppercase tracking-wider font-bold">Smart Assistant</span>
                      </div>
                      <h2 className="font-headline-md-mobile text-[22px] font-bold text-primary leading-tight">Your Unified Inbox</h2>
                      <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">
                        We've gathered all school, family, and utility emails for easy management.
                      </p>
                      <button 
                        onClick={handleRunFullInboxScan}
                        className="mt-2 bg-primary text-on-primary font-label-md text-[13.5px] font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform duration-200 shadow-md w-full cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">analytics</span>
                        Run Full Inbox Scan
                      </button>
                    </div>
                  </section>

                  {/* Filter and Search Bar */}
                  <div className="bg-white/50 backdrop-blur-md rounded-[24px] p-3 border border-outline-variant/30 shadow-premium space-y-3">
                    <div className="flex gap-1 bg-stone-150/40 p-1 rounded-xl">
                      {['all', 'unread', 'read'].map(status => (
                        <button
                          key={status}
                          onClick={() => setEmailFilter(status)}
                          className={`flex-1 text-[11px] font-extrabold py-2 rounded-lg capitalize transition-all cursor-pointer ${emailFilter === status ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-850'}`}
                        >
                          {status} ({status === 'all' ? emails.length : status === 'unread' ? emails.filter(e => !e.read).length : emails.filter(e => e.read).length})
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search inbox..."
                        value={emailSearchQuery}
                        onChange={(e) => setEmailSearchQuery(e.target.value)}
                        className="w-full bg-white/60 border border-outline-variant/30 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition-all text-primary"
                      />
                      <span className="absolute left-3 top-2.5 text-stone-400 text-xs material-symbols-outlined">search</span>
                    </div>
                  </div>

                  {/* Inbox List */}
                  <section className="flex flex-col gap-3 text-left">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                        Inbox Notifications ({filteredEmails.length})
                      </span>
                    </div>

                    {filteredEmails.length === 0 ? (
                      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-10 border border-outline-variant/30 text-center text-stone-400 shadow-sm">
                        <span className="text-2xl block mb-2">✉️</span>
                        <p className="text-xs font-bold">No emails match the criteria.</p>
                      </div>
                    ) : (
                      filteredEmails.map(email => {
                        const avatar = getEmailAvatarConfig(email);
                        const hasAnalysis = !!analysisResults[email.id];

                        return (
                          <div 
                            key={email.id}
                            onClick={() => {
                              setActiveEmail(email);
                              if (!email.read) {
                                if (token) {
                                  fetch(`/api/emails/${email.id}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ read: true })
                                  }).catch(err => console.error("Error updating email read state in SQLite:", err));
                                }
                                setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
                              }
                            }}
                            className="email-card bg-surface-container-lowest p-5 rounded-2xl flex items-start gap-4 shadow-[0px_4px_20px_rgba(45,41,38,0.04)] border border-outline-variant/5 hover:scale-[1.01] hover:bg-white transition-all duration-200 cursor-pointer text-left"
                          >
                            <div className={`w-12 h-12 rounded-full ${avatar.color} flex items-center justify-center flex-shrink-0 shadow-2xs`}>
                              <span className="material-symbols-outlined text-[20px]">{avatar.icon}</span>
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <h4 className="font-label-md text-[13px] text-primary font-bold truncate max-w-[70%]">{email.from.split(' <')[0]}</h4>
                                <span className="font-label-sm text-[11px] text-on-surface-variant/60 shrink-0 font-semibold">{email.date === REFERENCE_DATE ? 'Today' : 'Yesterday'}</span>
                              </div>
                              <p className="font-label-md text-[13px] text-primary truncate mb-1 font-semibold">{email.subject}</p>
                              <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-1 opacity-70 leading-normal">{email.body}</p>
                              
                              {hasAnalysis && (
                                <div className="mt-2.5 flex items-center gap-1">
                                  <span className="text-[9px] font-extrabold text-secondary bg-secondary/5 border border-secondary/15 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                    AI Summarized
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </section>
                </div>
              )}

              {/* TAB 3: ACTION LIST */}
              {activeTab === 'actions' && (
                <div className="space-y-6">
                  {/* Aggregated Urgent Header Card */}
                  <section className="text-left">
                    <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/30 flex flex-col gap-3 shadow-sm text-left">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="font-label-sm text-[10px] text-secondary uppercase tracking-wider font-bold">Executive Digest</span>
                      </div>
                      <h2 className="font-headline-md-mobile text-[22px] font-bold text-primary leading-tight">Your Action List</h2>
                      <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">
                        Consolidated family tasks automatically aggregated from expired documents and incoming smart correspondences.
                      </p>
                      
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-extrabold text-stone-500 border-t border-outline-variant/20 pt-3 w-full">
                        <div className="flex items-center gap-1.5">
                          <span>🔴</span> {criticalActions.filter(a => !completedActionIds.includes(a.id)).length} CRITICAL
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>🟡</span> {warningActions.filter(a => !completedActionIds.includes(a.id)).length} SOON
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>✅</span> {completedActionIds.length} DONE
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Assignee Filter Controls */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Assignee</label>
                    <div className="flex gap-1.5 bg-[#efe7dd]/40 p-1 rounded-2xl">
                      {['all', 'Ahmed', 'Sara', 'Family'].map(assignee => (
                        <button 
                          key={assignee}
                          onClick={() => setActionAssigneeFilter(assignee)}
                          className={`flex-1 text-[11px] font-extrabold py-2 rounded-xl capitalize transition-all cursor-pointer ${actionAssigneeFilter === assignee ? 'bg-white text-stone-900 shadow-xs border border-white/60' : 'text-stone-500 hover:text-stone-850'}`}
                        >
                          {assignee === 'all' ? 'All' : assignee === 'Family' ? 'Joint' : assignee}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Action Lists */}
                  <div className="space-y-6">
                    {dynamicActions.length === 0 ? (
                      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-10 border border-outline-variant/30 text-center text-stone-400 shadow-sm text-left">
                        <span className="text-3xl block mb-2.5">📋</span>
                        <p className="text-xs font-bold">No active family actions pending.</p>
                        <p className="text-[10px] text-stone-400 mt-1">Scan emails in your Inbox or update document statuses to sync family schedules.</p>
                      </div>
                    ) : (
                      <>
                        {/* 1. Critical Tasks */}
                        {criticalActions.length > 0 && (
                          <div className="flex flex-col gap-3 text-left">
                            <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full uppercase tracking-wider self-start">CRITICAL / EXPIRED</span>
                            <div className="space-y-3">
                              {criticalActions.map(action => {
                                const isComplete = completedActionIds.includes(action.id);
                                const member = FAMILY_MEMBERS[action.owner] || FAMILY_MEMBERS.Family;

                                return (
                                  <div 
                                    key={action.id} 
                                    onClick={() => toggleActionComplete(action.id)}
                                    className={`bg-white rounded-xl p-5 border-l-4 border-error shadow-[0px_4px_20px_rgba(45,41,38,0.04)] flex items-start gap-4 cursor-pointer hover:scale-[1.01] transition-all duration-200 ${isComplete ? 'opacity-55' : ''}`}
                                  >
                                    <button 
                                      type="button"
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${isComplete ? 'bg-error border-error shadow-xs' : 'border-rose-300 bg-white'}`}
                                    >
                                      {isComplete && (
                                        <svg className="w-3.5 h-3.5 fill-none stroke-current text-white stroke-3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <h4 className={`text-[13px] font-bold leading-snug ${isComplete ? 'line-through text-stone-400 font-medium' : 'text-primary'}`}>
                                        {action.title}
                                      </h4>
                                      <p className="text-[10px] text-stone-500 font-semibold mt-1">
                                        {action.subtitle}
                                      </p>
                                      
                                      <div className="flex items-center gap-2 mt-2.5">
                                        <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${member.color}`}>
                                          {action.owner}
                                        </span>
                                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                          {action.icon} {action.category}
                                        </span>
                                        {action.type === 'document' && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedDoc(action.rawDoc);
                                            }}
                                            className="ml-auto text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 shadow-2xs active:scale-95 cursor-pointer"
                                          >
                                            Renewal Setup
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. Warnings / Expiring Soon */}
                        {warningActions.length > 0 && (
                          <div className="flex flex-col gap-3 text-left pt-2">
                            <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full uppercase tracking-wider self-start">WARNINGS / SOON</span>
                            <div className="space-y-3">
                              {warningActions.map(action => {
                                const isComplete = completedActionIds.includes(action.id);
                                const member = FAMILY_MEMBERS[action.owner] || FAMILY_MEMBERS.Family;

                                return (
                                  <div 
                                    key={action.id} 
                                    onClick={() => toggleActionComplete(action.id)}
                                    className={`bg-white rounded-xl p-5 border-l-4 border-secondary-container shadow-[0px_4px_20px_rgba(45,41,38,0.04)] flex items-start gap-4 cursor-pointer hover:scale-[1.01] transition-all duration-200 ${isComplete ? 'opacity-55' : ''}`}
                                  >
                                    <button 
                                      type="button"
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${isComplete ? 'bg-secondary border-secondary shadow-xs' : 'border-amber-300 bg-white hover:border-secondary-container'}`}
                                    >
                                      {isComplete && (
                                        <svg className="w-3.5 h-3.5 fill-none stroke-current text-white stroke-3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <h4 className={`text-[13px] font-bold leading-snug ${isComplete ? 'line-through text-stone-400 font-medium' : 'text-primary'}`}>
                                        {action.title}
                                      </h4>
                                      <p className="text-[10px] text-stone-500 font-semibold mt-1">
                                        {action.subtitle}
                                      </p>
                                      
                                      <div className="flex items-center gap-2 mt-2.5">
                                        <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${member.color}`}>
                                          {action.owner}
                                        </span>
                                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                          {action.icon} {action.category}
                                        </span>
                                        {action.type === 'document' && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedDoc(action.rawDoc);
                                            }}
                                            className="ml-auto text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 shadow-2xs active:scale-95 cursor-pointer"
                                          >
                                            Renewal Setup
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. General Tasks */}
                        {taskActions.length > 0 && (
                          <div className="flex flex-col gap-3 text-left pt-2">
                            <span className="text-[9px] font-extrabold text-[#5555a9] bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider self-start font-semibold">HOUSEHOLD TASKS</span>
                            <div className="space-y-3">
                              {taskActions.map(action => {
                                const isComplete = completedActionIds.includes(action.id);
                                const member = FAMILY_MEMBERS[action.owner] || FAMILY_MEMBERS.Family;

                                return (
                                  <div 
                                    key={action.id} 
                                    onClick={() => toggleActionComplete(action.id)}
                                    className={`bg-white rounded-xl p-5 border-l-4 border-outline-variant/30 shadow-[0px_4px_20px_rgba(45,41,38,0.04)] flex items-start gap-4 cursor-pointer hover:scale-[1.01] transition-all duration-200 ${isComplete ? 'opacity-55' : ''}`}
                                  >
                                    <button 
                                      type="button"
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${isComplete ? 'bg-primary border-primary shadow-xs' : 'border-stone-300 bg-white hover:border-primary'}`}
                                    >
                                      {isComplete && (
                                        <svg className="w-3.5 h-3.5 fill-none stroke-current text-white stroke-3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <h4 className={`text-[13px] font-bold leading-snug ${isComplete ? 'line-through text-stone-400 font-medium' : 'text-primary'}`}>
                                        {action.title}
                                      </h4>
                                      <p className="text-[10px] text-stone-500 font-semibold mt-1">
                                        {action.subtitle}
                                      </p>
                                      {action.emailSubject && (
                                        <p className="text-[9px] text-indigo-650 font-bold mt-1.5">
                                          ✉️ Extracted from: "{action.emailSubject}"
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-2 mt-2.5">
                                        <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${member.color}`}>
                                          {action.owner}
                                        </span>
                                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                          {action.icon} {action.category}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

            </main>

            {/* 🛍️ iOS Bottom Navigation Tab Bar */}
            <nav className="absolute bottom-0 left-0 right-0 bg-[#fff8f1]/80 backdrop-blur-xl border-t border-outline-variant/20 py-3.5 pb-8 flex justify-around items-center z-30 shadow-lg rounded-t-2xl shrink-0">
              <button 
                onClick={() => setActiveTab('documents')}
                className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${activeTab === 'documents' ? "text-primary font-bold relative after:content-[''] after:absolute after:-bottom-1.5 after:w-1.5 after:h-1.5 after:bg-secondary after:rounded-full" : "text-on-surface-variant hover:opacity-85"}`}
              >
                <span className="material-symbols-outlined text-[22px]">description</span>
                <span className="font-label-sm text-[12px] mt-1">Documents</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('inbox')}
                className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 relative ${activeTab === 'inbox' ? "text-primary font-bold relative after:content-[''] after:absolute after:-bottom-1.5 after:w-1.5 after:h-1.5 after:bg-secondary after:rounded-full" : "text-on-surface-variant hover:opacity-85"}`}
              >
                <span className="material-symbols-outlined text-[22px]">mail</span>
                <span className="font-label-sm text-[12px] mt-1">Inbox</span>
                {emails.filter(e => !e.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-3 w-4 h-4 bg-secondary text-white font-black text-[9px] rounded-full flex items-center justify-center scale-90 border border-[#fff8f1]">
                    {emails.filter(e => !e.read).length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveTab('actions')}
                className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 relative ${activeTab === 'actions' ? "text-primary font-bold relative after:content-[''] after:absolute after:-bottom-1.5 after:w-1.5 after:h-1.5 after:bg-secondary after:rounded-full" : "text-on-surface-variant hover:opacity-85"}`}
              >
                <span className="material-symbols-outlined text-[22px]">format_list_bulleted</span>
                <span className="font-label-sm text-[12px] mt-1">Action List</span>
                {dynamicActions.filter(a => a.urgency === 'high' && !completedActionIds.includes(a.id)).length > 0 && (
                  <span className="absolute top-0 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#fff8f1] animate-pulse"></span>
                )}
              </button>
            </nav>
          </>
        )}

        {/* ==========================================
            MODAL OVERLAYS & DETAIL PANELS (SLIDE UP PANELS)
           ========================================== */}

        {/* 1. Batch Scanning Cover Dashboard Overlay */}
        {isScanningInbox && (
          <div className="absolute inset-0 bg-[#fff8f1]/95 backdrop-blur-md z-55 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-scale-up">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-2xl material-symbols-outlined text-secondary animate-pulse-gentle">auto_awesome</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-[16px] font-extrabold text-primary uppercase tracking-wider">AI Inbox Scan Active</h3>
              <p className="text-xs text-on-surface-variant font-bold animate-pulse">{scanProgress}</p>
            </div>

            <div className="w-48 h-1.5 bg-stone-200 rounded-full overflow-hidden shadow-2xs">
              <div 
                className="h-full bg-secondary transition-all duration-300"
                style={{ width: `${scanStep * 25}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Multimodal AI Scanner Drawer Overlay */}
        {showScanner && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-end justify-center z-50 transition-all duration-300">
            <div className="w-full bg-[#fff8f1] rounded-t-[32px] max-h-[92%] overflow-y-auto no-scrollbar border-t border-outline-variant/10 flex flex-col animate-slide-up shadow-premium">
              <style>{`
                @keyframes scan-laser {
                  0% { top: 0%; opacity: 0.8; }
                  50% { top: 100%; opacity: 1; }
                  100% { top: 0%; opacity: 0.8; }
                }
                .scanner-laser {
                  animation: scan-laser 2.5s ease-in-out infinite;
                }
              `}</style>
              
              {/* Grab handle block */}
              <div className="sticky top-0 bg-[#fff8f1] pt-3 pb-3 border-b border-outline-variant/5 shrink-0 z-10">
                <div className="w-12 h-1.5 bg-outline-variant/40 rounded-full mx-auto mb-3"></div>
                <div className="flex items-center justify-between px-6">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-secondary">document_scanner</span>
                    <span className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider">Multimodal AI Scanner</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowScanner(false);
                      setScannerResult(null);
                      setScannerError(null);
                      setScannerImage(null);
                      setScannerType(null);
                    }}
                    className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-outline-variant/20 flex items-center justify-center text-sm font-bold text-primary transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1 text-left">
                
                {/* Intro Tagline */}
                <div className="space-y-1">
                  <p className="text-[12px] text-on-surface-variant leading-relaxed font-semibold">
                    Instantly scan document images (passports, consent slips, IDs) with live <strong className="text-secondary">Gemini 3.5 Flash</strong> to extract structured parameters and automatically synchronize them to your Family Vault.
                  </p>
                </div>

                {/* Viewfinder Viewport Container */}
                <div className="relative aspect-[4/3] w-full rounded-[24px] border-2 border-dashed border-outline-variant/40 bg-stone-900/5 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                  {scannerImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-stone-950">
                      <img 
                        src={scannerImage} 
                        alt="Document Viewfinder" 
                        className="max-w-full max-h-full object-contain opacity-90"
                      />
                      
                      {/* Viewfinder corner brackets */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-white/70 rounded-tl-sm"></div>
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-white/70 rounded-tr-sm"></div>
                      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-white/70 rounded-bl-sm"></div>
                      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-white/70 rounded-br-sm"></div>
                      
                      {/* Viewfinder Grid lines */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                        <div className="border-r border-dashed border-white"></div>
                        <div className="border-r border-dashed border-white"></div>
                        <div></div>
                        <div className="border-b border-dashed border-white col-span-3"></div>
                        <div className="border-b border-dashed border-white col-span-3"></div>
                      </div>

                      {/* Laser scanning animation */}
                      {scannerLoading && (
                        <div className="absolute left-0 right-0 h-1 bg-emerald-400 scanner-laser shadow-[0_0_12px_#34d399] z-10 pointer-events-none"></div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-16 h-16 rounded-full bg-[#f5ede3] flex items-center justify-center text-primary/70 mx-auto border border-outline-variant/20 shadow-3xs">
                        <span className="material-symbols-outlined text-[32px]">photo_camera</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[12px] font-extrabold text-primary">No document image loaded</p>
                        <p className="text-[10px] text-stone-400 font-bold">Select a sample template or upload your own file below</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Indicator */}
                {scannerLoading && (
                  <div className="bg-white/80 rounded-[20px] p-4 border border-outline-variant/15 shadow-2xs flex items-center gap-3 animate-pulse">
                    <div className="w-5 h-5 rounded-full border-2 border-secondary/25 border-t-secondary animate-spin shrink-0"></div>
                    <p className="text-[11px] font-bold text-secondary uppercase tracking-wider">{scannerProgress}</p>
                  </div>
                )}

                {/* Error Banner */}
                {scannerError && (
                  <div className="bg-red-50 border border-red-200/50 rounded-[20px] p-4 flex items-start gap-3 text-left">
                    <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Scanning Failure</h4>
                      <p className="text-[11.5px] text-red-700 font-medium leading-relaxed">{scannerError}</p>
                    </div>
                  </div>
                )}

                {/* Result Presentation */}
                {scannerResult && (
                  <div className="bg-[#fff] border border-outline-variant/15 rounded-[24px] p-5 shadow-sm space-y-4 animate-scale-up">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <span className="text-lg">🎉</span>
                      <div>
                        <h4 className="text-[12.5px] font-extrabold text-primary">Gemini Scan Successful</h4>
                        <p className="text-[10px] text-stone-400 font-bold mt-0.5">{scannerResult.summary}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                      <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-100/50">
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">Document Name</span>
                        <span className="font-extrabold text-primary block mt-1">{scannerResult.extractedData?.name || 'N/A'}</span>
                      </div>
                      <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-100/50">
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">Document Number</span>
                        <span className="font-extrabold text-primary font-mono block mt-1">{scannerResult.extractedData?.number || 'N/A'}</span>
                      </div>
                      <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-100/50">
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">Owner</span>
                        <span className="font-extrabold text-primary block mt-1">{scannerResult.extractedData?.owner || 'N/A'}</span>
                      </div>
                      <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-100/50">
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">Expiry / Trip Date</span>
                        <span className="font-extrabold text-primary block mt-1">{scannerResult.extractedData?.expiryDate || 'N/A'}</span>
                      </div>
                    </div>

                    {scannerResult.suggestedActions && scannerResult.suggestedActions.length > 0 && (
                      <div className="space-y-2 border-t border-stone-100 pt-3 text-left">
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">Extracted Action Items</span>
                        <div className="space-y-2">
                          {scannerResult.suggestedActions.map((act, idx) => (
                            <div key={idx} className="flex gap-2.5 items-start bg-[#fff8f1]/60 p-2.5 rounded-lg border border-outline-variant/15">
                              <span className="text-xs mt-0.5">📝</span>
                              <div>
                                <p className="font-bold text-primary text-[11px] leading-snug">{act.action}</p>
                                <p className="text-[9.5px] text-on-surface-variant font-bold mt-0.5">Assignee: {act.owner || 'Family'} {act.deadline ? `• Due: ${act.deadline}` : ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl p-3 flex items-center gap-2.5 text-[11px] font-bold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">done_all</span>
                      <span>
                        {scannerResult.documentType === 'passport' || scannerResult.extractedData?.category === 'Identity' 
                          ? 'Synchronized! Document successfully added to Vault.' 
                          : 'Synchronized! Action items automatically mapped to Action List.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Upload & Sample Controls Card */}
                <div className="bg-white rounded-2xl p-5 border border-outline-variant/20 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    
                    {/* Native File Upload wrapper button */}
                    <label className="flex-1 bg-primary text-on-primary hover:bg-stone-850 py-3 px-4 rounded-xl font-label-md text-[12px] font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] select-none text-center">
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      <span>Upload Custom Image</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleScannerImageUpload} 
                        className="hidden" 
                      />
                    </label>

                    {/* Scan Trigger Button */}
                    {scannerImage && (
                      <button
                        onClick={handleRunMultimodalScan}
                        disabled={scannerLoading}
                        className="flex-1 bg-secondary text-white hover:opacity-90 py-3 px-4 rounded-xl font-label-md text-[12px] font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px] animate-pulse">auto_awesome</span>
                        <span>{scannerLoading ? 'Scanning...' : 'Run Gemini AI Scan'}</span>
                      </button>
                    )}
                  </div>

                  {/* Sample selection title */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block text-left">Demonstration Templates</span>
                    <div className="grid grid-cols-2 gap-3">
                      
                      <button
                        onClick={() => handleSelectSampleDocument('passport')}
                        className={`p-3.5 rounded-xl border text-left transition-all active:scale-98 cursor-pointer flex flex-col gap-2 ${scannerType === 'passport' ? 'bg-[#7a1b2e]/5 border-[#7a1b2e] shadow-3xs' : 'bg-stone-50 hover:bg-stone-100 border-outline-variant/20'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xl">🇦🇪</span>
                          <span className="text-[9px] font-bold uppercase text-[#7a1b2e] bg-[#7a1b2e]/10 px-2 py-0.5 rounded-full">Identity</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold text-primary">UAE Passport</p>
                          <p className="text-[9.5px] text-stone-400 font-semibold mt-0.5">Gold emblem passport</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSelectSampleDocument('consent')}
                        className={`p-3.5 rounded-xl border text-left transition-all active:scale-98 cursor-pointer flex flex-col gap-2 ${scannerType === 'consent' ? 'bg-secondary/5 border-secondary shadow-3xs' : 'bg-stone-50 hover:bg-stone-100 border-outline-variant/20'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xl">📝</span>
                          <span className="text-[9px] font-bold uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Education</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold text-primary">Consent Form</p>
                          <p className="text-[9.5px] text-stone-400 font-semibold mt-0.5">School permission letter</p>
                        </div>
                      </button>

                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* 2. Document Detailed Sheet Overlay */}
        {selectedDoc && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-end justify-center z-50 transition-all duration-300">
            <div className="w-full bg-[#fff8f1] rounded-t-[32px] max-h-[88%] overflow-y-auto no-scrollbar border-t border-outline-variant/10 flex flex-col animate-slide-up shadow-premium">
              
              {/* Drag handle block */}
              <div className="sticky top-0 bg-[#fff8f1] pt-3 pb-3 border-b border-outline-variant/5 shrink-0 z-10">
                <div className="w-12 h-1.5 bg-outline-variant/40 rounded-full mx-auto mb-3"></div>
                <div className="flex items-center justify-between px-6">
                  <span className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider">Document Manager</span>
                  <button 
                    onClick={() => {
                      setSelectedDoc(null);
                      setAiError(null);
                    }}
                    className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-outline-variant/20 flex items-center justify-center text-sm font-bold text-primary transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1 text-left">
                
                {/* Header Information */}
                <div className="bg-white/80 rounded-[24px] p-5 border border-outline-variant/10 shadow-sm flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold bg-[#f5ede3] text-primary border border-outline-variant/20 px-2.5 py-0.8 rounded-full uppercase tracking-wider">
                      {selectedDoc.category}
                    </span>
                    <h3 className="text-[18px] font-extrabold text-primary leading-tight mt-2.5">{selectedDoc.name}</h3>
                    <p className="text-[12px] text-on-surface-variant mt-1 font-semibold">
                      Owner: <strong>{selectedDoc.owner}</strong> • No: {selectedDoc.number || 'N/A'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border border-outline-variant/15 flex items-center justify-center text-2xl shadow-3xs bg-[#fff8f1]">
                    {FAMILY_MEMBERS[selectedDoc.owner]?.avatar || '🏡'}
                  </div>
                </div>

                {/* Expiry Details */}
                <div className="bg-white/80 rounded-[24px] p-5 border border-outline-variant/10 shadow-sm space-y-3">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Timeline Expiry Status</span>
                  
                  {(() => {
                    const status = getDocumentStatus(selectedDoc.expiryDate);
                    const diffDays = getDaysDifference(selectedDoc.expiryDate, REFERENCE_DATE);

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${status.badgeClass.replace('text-rose-700', 'text-error').replace('text-amber-700', 'text-secondary')}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-primary font-bold">
                            Expires: {selectedDoc.expiryDate}
                          </span>
                        </div>
                        
                        <div className="bg-[#fff8f1] p-4 rounded-xl border border-outline-variant/10 text-xs leading-relaxed text-on-surface-variant font-semibold">
                          {diffDays < 0 ? (
                            <p className="text-error font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">warning</span>
                              This document expired {Math.abs(diffDays)} days ago. Renewal action is highly critical to avoid travel or coverage penalties.
                            </p>
                          ) : diffDays <= 90 ? (
                            <p className="text-secondary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              Expiry is in {diffDays} days. Starting your renewal application now is highly recommended.
                            </p>
                          ) : (
                            <p className="text-primary/70 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              Valid. This document is active. No tasks are required.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* AI Document Renewal Plan Checklist */}
                <div className="bg-gradient-to-br from-secondary/5 via-white/50 to-[#efe7dd]/40 rounded-[28px] p-5 border border-outline-variant/20 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5 animate-pulse-gentle">auto_awesome</span>
                    <div className="text-left">
                      <h4 className="text-[13px] font-extrabold text-primary uppercase tracking-wide">AI Document Renewal Roadmap</h4>
                      <p className="text-[11.5px] text-on-surface-variant leading-relaxed mt-0.5">
                        Generate a localized step-by-step renewal roadmap tailored for this document type in the UAE.
                      </p>
                    </div>
                  </div>

                  {aiLoading && (
                    <div className="bg-white/80 rounded-2xl p-4 border border-outline-variant/10 flex items-center justify-center gap-3 animate-pulse py-6">
                      <div className="w-5 h-5 rounded-full border-2 border-secondary/20 border-t-secondary animate-spin"></div>
                      <span className="text-[12px] font-bold text-secondary">Consulting UAE Smart Channels...</span>
                    </div>
                  )}

                  {!renewalPlans[selectedDoc.id] && !aiLoading && (
                    <button 
                      onClick={() => handleGetRenewalPlan(selectedDoc)}
                      className="w-full bg-secondary hover:bg-[#5555a9]/90 active:scale-[0.98] text-white font-extrabold text-[12px] py-3.5 px-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      <span>Generate Renewal Plan</span>
                    </button>
                  )}

                  {/* Render steps list if plan generated */}
                  {renewalPlans[selectedDoc.id] && !aiLoading && (
                    <div className="space-y-4 pt-1">
                      {/* Step completion progress bar */}
                      <div className="bg-white/80 p-3.5 rounded-xl border border-outline-variant/10 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wide">
                          <span>Renew Plan Status</span>
                          <span className="text-secondary font-black">
                            {renewalStepsProgress[selectedDoc.id]?.length || 0} of {renewalPlans[selectedDoc.id].length} completed
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden shadow-3xs">
                          <div 
                            className="h-full bg-secondary transition-all duration-300"
                            style={{ 
                              width: `${((renewalStepsProgress[selectedDoc.id]?.length || 0) / renewalPlans[selectedDoc.id].length) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Step Cards */}
                      <div className="space-y-2">
                        {renewalPlans[selectedDoc.id].map((step, idx) => {
                          const isStepCompleted = (renewalStepsProgress[selectedDoc.id] || []).includes(idx);
                          return (
                            <div 
                              key={idx}
                              className={`bg-white/60 p-3.5 rounded-2xl border border-outline-variant/10 flex items-start gap-3.5 transition-all ${isStepCompleted ? 'bg-secondary/5 border-secondary/15 opacity-70' : ''}`}
                            >
                              <button 
                                onClick={() => handleToggleRenewalStep(selectedDoc.id, idx)}
                                className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${isStepCompleted ? 'bg-secondary border-secondary shadow-xs' : 'border-stone-300 bg-white hover:border-secondary'}`}
                              >
                                {isStepCompleted && (
                                  <svg className="w-3.5 h-3.5 fill-none stroke-current text-white stroke-3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                )}
                              </button>

                              <div className="flex-1 text-left min-w-0">
                                <h5 className={`text-[12.5px] font-bold ${isStepCompleted ? 'line-through text-stone-400' : 'text-primary'}`}>
                                  Step {idx + 1}: {step.title}
                                </h5>
                                <p className="text-[11px] text-on-surface-variant leading-normal mt-0.5">{step.details}</p>
                                
                                <div className="flex flex-wrap gap-2 mt-2.5 text-[9.5px] font-extrabold text-on-surface-variant">
                                  <span className="bg-[#f5ede3] border border-outline-variant/20 px-2 py-0.5 rounded-md">
                                    📍 {step.location}
                                  </span>
                                  {step.fee && step.fee !== 'Free' && (
                                    <span className="bg-secondary/5 border border-secondary/15 px-2 py-0.5 rounded-md text-secondary">
                                      💵 {step.fee}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* Edit & Delete Controls */}
                <div className="border-t border-outline-variant/10 pt-5 flex gap-3">
                  <button 
                    onClick={() => handleDeleteDocument(selectedDoc.id)}
                    className="flex-1 border border-outline-variant/25 bg-white hover:bg-rose-50 text-error hover:text-error font-bold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete Document
                  </button>
                  <button 
                    onClick={() => {
                      alert("Manual document metadata editor is locked in this version.");
                    }}
                    className="flex-1 bg-primary hover:bg-stone-850 text-white font-bold text-xs py-3.5 rounded-xl transition-all text-center active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit Details
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* 3. Add Document Modal Overlay */}
        {showAddDocModal && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all duration-300 animate-scale-up">
            <form 
              onSubmit={handleAddDocument}
              className="w-full max-w-[360px] bg-[#fff8f1] border border-outline-variant/25 rounded-[28px] p-6 shadow-premium text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Add Document</h3>
                <button 
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Document Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. UAE Passport, Driving Licence..."
                  value={newDocData.name}
                  onChange={(e) => setNewDocData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white border border-outline-variant/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-stone-400 text-primary"
                />
              </div>

              {/* Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Document Number (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. N-99887766"
                  value={newDocData.number}
                  onChange={(e) => setNewDocData(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full bg-white border border-outline-variant/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-stone-400 text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Owner */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Owner</label>
                  <select 
                    value={newDocData.owner}
                    onChange={(e) => setNewDocData(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full bg-white border border-outline-variant/25 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-stone-400 text-primary"
                  >
                    {Object.keys(FAMILY_MEMBERS).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Category</label>
                  <select 
                    value={newDocData.category}
                    onChange={(e) => setNewDocData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white border border-outline-variant/25 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-stone-400 text-primary"
                  >
                    <option value="Identity">Identity</option>
                    <option value="Driving">Driving</option>
                    <option value="Health">Health</option>
                    <option value="Education">Education</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Expiry Date</label>
                <input 
                  type="date" 
                  required
                  value={newDocData.expiryDate}
                  onChange={(e) => setNewDocData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full bg-white border border-outline-variant/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-stone-400 text-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-outline-variant/10">
                <button 
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="flex-1 border border-outline-variant/25 hover:bg-stone-50 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#181512] hover:bg-stone-850 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer text-center"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    )}
  </div>
    </div>
  );
}

// =============================================================
// Premium iOS Lockscreen & Multi-Tenant Authentication UI
// =============================================================
function Lockscreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [migrateData, setMigrateData] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dynamic clock state for authentic iOS Lockscreen feel
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Pre-seed some gorgeous, premium fake notification cards on the lockscreen
  const simulatedNotifications = [
    {
      id: 1,
      icon: '🛂',
      title: 'Passport Renewal Required',
      body: "Ahmed's passport is expiring in 45 days. Complete 4 scheduled tasks.",
      time: 'now'
    },
    {
      id: 2,
      icon: '🏫',
      title: 'Greenwood School Fee',
      body: 'Term 3 tuition invoice AED 24,500 due in 14 days.',
      time: '2h ago'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering 
      ? { email, password, familyName, migrateData } 
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLogin(data.token, data.user);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setError('');
    setEmail('test@family.com');
    setPassword('password123');
    setIsRegistering(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none relative bg-[#1c1815] text-white font-sans text-left">
      {/* Sleek animated glassmorphic background layer */}
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4b3d32 0%, #1c1815 100%)' }}></div>
      <div className="absolute top-1/4 left-10 w-48 h-48 bg-[#a5a5ff]/10 rounded-full blur-[60px] animate-pulse-gentle"></div>
      <div className="absolute bottom-1/4 right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] animate-pulse-gentle" style={{ animationDelay: '1.5s' }}></div>

      {/* Main Lockscreen Space */}
      <div className="flex-1 flex flex-col z-10 p-6 pt-16 overflow-y-auto no-scrollbar relative pb-32">
        {/* iOS Top Padlock Icon */}
        <div className="flex justify-center mb-4">
          <span className="material-symbols-outlined text-[20px] text-white/50 animate-bounce">
            lock
          </span>
        </div>

        {/* ⏰ Giant Centered iOS Clock */}
        <div className="text-center space-y-1 select-none">
          <h2 className="text-[13px] font-semibold text-white/77 uppercase tracking-widest leading-none">
            {formatDate(currentTime)}
          </h2>
          <h1 className="text-[64px] font-thin tracking-tighter text-white font-sans leading-none mt-1">
            {formatTime(currentTime)}
          </h1>
        </div>

        {/* 🔔 Glassmorphic iOS Notification Stack */}
        <div className="mt-8 space-y-3">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block ml-1.5">Family Notifications</span>
          {simulatedNotifications.map((notif) => (
            <div key={notif.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 flex gap-3 shadow-md hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.01]">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-lg shrink-0 select-none shadow-inner">
                {notif.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h4 className="text-[12.5px] font-bold text-white tracking-wide truncate">{notif.title}</h4>
                  <span className="text-[9.5px] font-semibold text-white/40 uppercase tracking-wider">{notif.time}</span>
                </div>
                <p className="text-[11px] text-white/70 mt-0.5 leading-normal">{notif.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 🔑 Credentials Form Slide-up Panel */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg border border-white/15 rounded-3xl p-5.5 shadow-premium-lg space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">
              {isRegistering ? 'Create Family Vault' : 'Unlock Dashboard'}
            </h3>
            <button 
              type="button"
              onClick={() => {
                setError('');
                setIsRegistering(!isRegistering);
              }}
              className="text-[11px] font-bold text-[#a5a5ff] hover:underline cursor-pointer"
            >
              {isRegistering ? 'Have an account? Sign In' : 'New? Create Account'}
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 p-3 rounded-xl text-[11.5px] font-bold flex items-center gap-2 animate-pulse-gentle">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block ml-1">Family Surname</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-white/40 text-[16px]">family_restroom</span>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Hassan" 
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-white/30 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block ml-1">Family Email Address</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-white/40 text-[16px]">mail</span>
                <input 
                  type="email" 
                  required 
                  placeholder="name@family.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-white/30 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block ml-1">Private Password</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-white/40 text-[16px]">key</span>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-white/30 transition-colors"
                />
              </div>
            </div>

            {isRegistering && (
              <label className="flex items-center gap-2 cursor-pointer select-none py-1 ml-0.5">
                <input 
                  type="checkbox" 
                  checked={migrateData} 
                  onChange={(e) => setMigrateData(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#a5a5ff] bg-white/5 border-white/10 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-white/60">
                  Migrate offline browser drafts into SQLite database
                </span>
              </label>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs py-3.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 text-center"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-900/20 border-t-stone-900 animate-spin"></div>
                  <span>Securing Vault...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  <span>{isRegistering ? 'Create & Unlock' : 'Unlock Dashboard'}</span>
                </>
              )}
            </button>
          </form>

          {/* Tester Account Card (Low Opacity Glass Accent) */}
          <div className="bg-white/[0.04] border border-white/5 rounded-2xl p-3.5 text-left text-[11px] leading-relaxed text-white/65 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[10px] uppercase text-white/50 tracking-wider">💡 Mock Testing Account</span>
              <button 
                type="button" 
                onClick={handleDemoFill}
                className="text-[10.5px] font-black text-[#a5a5ff] hover:underline cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
              >
                Auto-fill & Log In
              </button>
            </div>
            <p className="font-medium">
              We seeded a premium test profile in the database. Use email <code className="bg-white/10 text-white font-mono px-1.5 rounded">test@family.com</code> and password <code className="bg-white/10 text-white font-mono px-1.5 rounded">password123</code> to instantly enter the vault.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
