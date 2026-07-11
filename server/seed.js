// Demo-data seeder: node server/seed.js <account-email>
// Ports the Hassan-family fixtures into SQLite for the given account, with
// every date shifted forward so urgency relative to the real "today" matches
// what the fixtures assumed on their original reference date. (Dates written
// inside email body text are not rewritten — cosmetic only.)
import { query } from './db.js';
import { today, statusFromExpiry } from './lib/dates.js';

const FIXTURE_REFERENCE_DATE = '2026-05-19';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node server/seed.js <account-email>');
  process.exit(1);
}

const DAY_MS = 1000 * 60 * 60 * 24;
const shiftDays = Math.round(
  (new Date(today()).getTime() - new Date(FIXTURE_REFERENCE_DATE).getTime()) / DAY_MS
);

function shift(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + shiftDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MEMBERS = [
  { name: 'Ahmed', role: 'Parent 1', color: '#6366f1', avatar: '👨‍💼', isChild: 0, grade: '', schoolEmail: '', aliases: [] },
  { name: 'Sara', role: 'Parent 2', color: '#f43f5e', avatar: '👩‍⚕️', isChild: 0, grade: '', schoolEmail: '', aliases: [] },
  { name: 'Yusuf', role: 'Child 1 (9)', color: '#f59e0b', avatar: '👦', isChild: 1, grade: 'Year 4', schoolEmail: 'admin@greenwood.sch.ae', aliases: ['Year 4'] },
  { name: 'Layla', role: 'Child 2 (6)', color: '#10b981', avatar: '👧', isChild: 1, grade: 'KG 2', schoolEmail: 'accounts@tinytots.ae', aliases: ['nursery'] },
  { name: 'Family', role: 'Household', color: '#14b8a6', avatar: '🏡', isChild: 0, grade: '', schoolEmail: '', aliases: [] },
];

const DOCUMENTS = [
  { id: 'doc-1', title: 'UAE Passport', number: 'N1234567', expiryDate: '2024-11-15', member: 'Ahmed', category: 'Identity' },
  { id: 'doc-2', title: 'UAE Driving Licence', number: 'DL-99887', expiryDate: '2026-07-01', member: 'Ahmed', category: 'Driving' },
  { id: 'doc-3', title: 'UAE Passport', number: 'N7654321', expiryDate: '2027-09-20', member: 'Sara', category: 'Identity' },
  { id: 'doc-4', title: 'UK Passport', number: 'GB-887766', expiryDate: '2025-06-10', member: 'Sara', category: 'Identity' },
  { id: 'doc-5', title: 'UAE Passport', number: 'N2468101', expiryDate: '2026-08-05', member: 'Yusuf', category: 'Identity' },
  { id: 'doc-6', title: 'School ID', number: 'SCH-998', expiryDate: '2026-06-30', member: 'Yusuf', category: 'Education' },
  { id: 'doc-7', title: 'UAE Passport', number: 'N1357911', expiryDate: '2027-03-12', member: 'Layla', category: 'Identity' },
  { id: 'doc-8', title: 'Health Insurance Card', number: 'CIG-8833', expiryDate: '2025-05-31', member: 'Layla', category: 'Health' },
  { id: 'doc-9', title: 'Home Contents Insurance', number: 'HC-9922', expiryDate: '2026-07-15', member: 'Family', category: 'Finance' },
  { id: 'doc-10', title: 'Car Insurance', number: 'CI-3344', expiryDate: '2026-07-22', member: 'Family', category: 'Driving' },
];

const EMAILS = [
  { id: 'email-1', from: 'Greenwood International School <admin@greenwood.sch.ae>', subject: 'Weekly Newsletter: Parent-Teacher Meetings & Book Fair Deadline', date: '2026-05-18', icon: '🏫', category: 'Education', read: 0, body: 'Dear Parents,\n\nPlease note that the Parent-Teacher meetings are scheduled for next Tuesday. Individual slots must be booked via the portal.\n\nAlso, the deadline to register for the annual Book Fair and submit reading selections is this Friday.\n\nFinally, the consent and permission slip for the Year 4 field trip must be returned signed by Friday afternoon.\n\nBest regards,\nGreenwood Admin' },
  { id: 'email-2', from: 'AllStars Football Academy <coach.marcus@allstars.ae>', subject: 'Training Schedule Change & Tournament Registration', date: '2026-05-17', icon: '⚽', category: 'Sports', read: 0, body: 'Hello families,\n\nPlease note training this Saturday is moved to 8:00 AM due to the forecasted heat. Please ensure the kids bring plenty of water.\n\nAlso, registration for the Summer Cup tournament closes in exactly 5 days. Please complete the kit order form at your earliest convenience to secure the new jerseys.\n\nBest,\nCoach Marcus' },
  { id: 'email-3', from: "King's College Hospital Clinic <pediatrics@kingsclinic.ae>", subject: 'Annual Pediatric Health Check Reminder', date: '2026-05-19', icon: '🩺', category: 'Health', read: 0, body: 'Dear Sara,\n\nThis is a reminder that Yusuf and Layla are due for their annual pediatric health check. Keeping up with annual checks is important for their school health records.\n\nPlease use the link below to book their slots for next week. Remember to bring your valid health insurance card and Emirates ID to the appointment.\n\nWarm regards,\nPediatric Team' },
  { id: 'email-4', from: 'Emirates Airlines <booking@emirates.com>', subject: 'Flight Confirmation: Dubai to London Heathrow', date: '2026-05-15', icon: '✈️', category: 'Travel', read: 1, body: "Thank you for booking with Emirates.\n\nYour flight EK007 from DXB to LHR is confirmed, departing in 47 days at 09:40 AM.\n\nPlease ensure you update your passport details in the manage booking portal at least 7 days before departure. Note that Sara's British passport must be valid for travel." },
  { id: 'email-5', from: 'Cigna Global Health <renewals@cigna.com>', subject: 'URGENT: Family Health Insurance Renewal Notice', date: '2026-05-19', icon: '🛡️', category: 'Insurance', read: 0, body: 'Dear Ahmed,\n\nYour family health insurance policy (Policy #CG-998877) will renew in exactly 30 days.\n\nAction is required to confirm your current plan benefits or switch plans before the automatic renewal date. Failure to respond may lead to a temporary gap in coverage or premium increase.\n\nSincerely,\nCigna Renewals Team' },
  { id: 'email-6', from: 'Greenwood Accounts Office <finance@greenwood.sch.ae>', subject: 'Term 3 Tuition Fees Invoice - Due in 14 Days', date: '2026-05-18', icon: '💵', category: 'Finance', read: 0, body: 'Dear Parents,\n\nThe Term 3 tuition fees invoice has been generated.\n\nThe total amount due is AED 24,500, payable within 14 days. Please use our online payment portal to settle this invoice. A 5% late fee applies to payments received after the deadline.\n\nGreenwood Finance' },
  { id: 'email-7', from: 'GDRFA Dubai <no-reply@gdrfad.gov.ae>', subject: 'Residency Visa Renewal Appointment Confirmed', date: '2026-05-19', icon: '🛂', category: 'Admin', read: 0, body: 'Dear Ahmed,\n\nYour residency visa renewal biometrics appointment is confirmed for 9:00 AM in 5 days at the Al Manara Centre.\n\nPlease bring:\n1) Original Passport\n2) 4 passport-sized photos with white background\n3) Signed NOC letter from your sponsor\n\nThank you,\nGDRFA Support' },
  { id: 'email-8', from: 'Dubai Active Summer Camps <info@dubaiactive.com>', subject: 'Summer Camp Registration Opens Monday!', date: '2026-05-16', icon: '🏕️', category: 'Activities', read: 1, body: 'Get ready for summer!\n\nSummer Camp registration opens next Monday. Our early bird discount (15% off) ends in 10 days.\n\nSpaces are strictly limited and will be allocated on a first-come, first-served basis. Sign up today to guarantee their places!\n\nWarmly,\nDubai Active Team' },
  { id: 'email-9', from: 'Pearl Dental Clinic Dubai <reception@pearldental.ae>', subject: '6-Month Dental Checkup Overdue Notice', date: '2026-05-12', icon: '🦷', category: 'Health', read: 1, body: "Hi Sara,\n\nOur records show that the routine 6-month dental cleaning and checkup are now overdue. Regular checks help prevent cavities!\n\nPlease call our reception desk at 04-333-2211 to book an appointment this week.\n\nBest,\nPearl Dental Clinic" },
  { id: 'email-10', from: 'Greenwood Year 4 Coordinator <y4trip@greenwood.sch.ae>', subject: 'Year 4 Adventure Camp - Consent and Payment Due Next Wednesday', date: '2026-05-17', icon: '⛺', category: 'Education', read: 0, body: 'Hi Parents,\n\nDetails for the Year 4 overnight trip to Hatta are attached. The total cost is AED 250 and is due by next Wednesday.\n\nPlease submit the signed physical consent form and the completed medical conditions questionnaire to the class teacher.\n\nThanks,\nMs. Henderson' },
  { id: 'email-11', from: 'AXA Gulf Insurance <quotes@axagulf.ae>', subject: 'Car Insurance Renewal Quote - Policy #AX-4433', date: '2026-05-18', icon: '🚗', category: 'Insurance', read: 0, body: 'Dear Ahmed,\n\nYour comprehensive car insurance policy for your SUV will expire next month.\n\nYour renewal quote is attached with a 20% premium adjustment due to market rates. Please respond within 7 days to lock in this rate and avoid a lapse of registration.\n\nBest regards,\nAXA Team' },
  { id: 'email-12', from: 'Hamilton Aquatics Dubai <lessons@hamiltonaquatics.ae>', subject: 'Swimming Lesson Level Assessment - This Saturday', date: '2026-05-19', icon: '🏊', category: 'Sports', read: 0, body: "Hi Sara,\n\nYusuf's swimming level assessment is scheduled for this coming Saturday at 10:30 AM at the Hamdan Sports Complex.\n\nPlease ensure he arrives 15 minutes early and brings his goggles, swim cap, and dry towel.\n\nRegards,\nHamilton Coaching Team" },
  { id: 'email-13', from: 'Tiny Tots Nursery Dubai <accounts@tinytots.ae>', subject: 'Monthly Nursery Fees Invoice', date: '2026-05-19', icon: '🧸', category: 'Finance', read: 1, body: "Dear Parents,\n\nThe monthly tuition invoice for Layla's morning nursery sessions is AED 3,200.\n\nPayment is due in full by the 1st of next month. Please transfer to the bank details enclosed in the attached invoice PDF.\n\nWarm regards,\nTiny Tots Finance" },
  { id: 'email-14', from: 'British Embassy Dubai <consular.dubai@fcdo.gov.uk>', subject: 'Important consular update: UK Passport renewal times', date: '2026-05-10', icon: '🇬🇧', category: 'Admin', read: 1, body: 'Dear British Citizens,\n\nPlease be advised that the current processing time for UK passport renewals submitted from overseas is now running at 8 to 10 weeks due to seasonal demand.\n\nWe strongly advise applying early for summer travel. Do not book travel until you have your new passport.\n\nBritish Consular Services' },
  { id: 'email-15', from: 'Greenwood Portal <notifications@greenwood.portal.ae>', subject: 'New message from Class Teacher Ms. Henderson', date: '2026-05-19', icon: '📝', category: 'Education', read: 0, body: 'Notification:\n\nA new message has been posted on the Greenwood Parent Portal.\n\nMs. Henderson has requested all parents of Year 4 students to verify and submit the English reading homework log by this Thursday.\n\nGreenwood Portal' },
];

async function main() {
  // Wait a beat for db.js migrations to finish on open.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const user = await query.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    console.error(`No account found for ${email} — register in the app first.`);
    process.exit(1);
  }

  console.log(`Seeding demo data for ${email} (shifting fixture dates by ${shiftDays} days)`);

  // Replace starter members with the full fixture family.
  await query.run('DELETE FROM family_members WHERE user_id = ?', [user.id]);
  for (const m of MEMBERS) {
    await query.run(
      `INSERT INTO family_members (user_id, name, role, color, avatar, is_child, grade, school_email, aliases)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, m.name, m.role, m.color, m.avatar, m.isChild, m.grade, m.schoolEmail, JSON.stringify(m.aliases)]
    );
  }

  for (const d of DOCUMENTS) {
    const expiry = shift(d.expiryDate);
    await query.run(
      `INSERT OR REPLACE INTO documents (id, user_id, title, category, member, expiry_date, status, document_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [d.id, user.id, d.title, d.category, d.member, expiry, statusFromExpiry(expiry), d.number]
    );
  }

  for (const e of EMAILS) {
    await query.run(
      `INSERT OR REPLACE INTO emails (id, user_id, sender, subject, date, body, read, has_attachment, attachment_name, processed, icon, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, '', 0, ?, ?)`,
      [e.id, user.id, e.from, e.subject, shift(e.date), e.body, e.read, e.icon, e.category]
    );
  }

  console.log(`Seeded ${MEMBERS.length} members, ${DOCUMENTS.length} documents, ${EMAILS.length} emails.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
