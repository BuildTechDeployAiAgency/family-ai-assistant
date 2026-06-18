-- POC seed: on first sign-up, create a family + app user, and populate the
-- Hassan demo dataset so the app is immediately usable. Data shapes mirror
-- mobile/src/data/fixtures.ts (REFERENCE_DATE = 2026-05-19). DOBs derived from
-- the ages encoded in the fixture roles (Yusuf 9, Layla 6).
--
-- NOTE: for a real multi-family SaaS you would NOT seed demo data per sign-up.
-- This is a POC convenience and lives behind a single function call that can be
-- dropped later.

create or replace function public.seed_demo_family(fid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m_ahmed  uuid;
  m_sara   uuid;
  m_yusuf  uuid;
  m_layla  uuid;
  m_family uuid;
  c_school uuid;
  c_cigna  uuid;
  c_visa   uuid;
  c_trip   uuid;
begin
  -- Members
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Ahmed', 'adult', 'Parent 1', date '1985-03-12', null, '👨‍💼', '#6366f1',
          array['ahmed','dad','baba','father','abu']) returning id into m_ahmed;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Sara', 'adult', 'Parent 2', date '1987-07-22', null, '👩‍⚕️', '#f43f5e',
          array['sara','mum','mom','mama','mother','umm']) returning id into m_sara;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Yusuf', 'child', 'Child 1', date '2017-02-10', 'Year 4', '👦', '#f59e0b',
          array['yusuf','yousef','yusef']) returning id into m_yusuf;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Layla', 'child', 'Child 2', date '2020-04-05', 'Nursery', '👧', '#10b981',
          array['layla','laila','leila']) returning id into m_layla;
  insert into family_members (family_id, name, member_type, role, avatar, color, aliases)
  values (fid, 'Family', 'household', 'Household', '🏡', '#14b8a6',
          array['family','household','home','us']) returning id into m_family;

  -- Documents (owner → member)
  insert into documents (family_id, member_id, title, category, document_number, expiry_date, progress, source_channel) values
    (fid, m_ahmed,  'UAE Passport',            'Identity', 'N1234567', date '2024-11-15', 0,   'seed'),
    (fid, m_ahmed,  'UAE Driving Licence',     'Driving',  'DL-99887', date '2026-07-01', 85,  'seed'),
    (fid, m_sara,   'UAE Passport',            'Identity', 'N7654321', date '2027-09-20', 100, 'seed'),
    (fid, m_sara,   'UK Passport',             'Identity', 'GB-887766', date '2025-06-10', 0,  'seed'),
    (fid, m_yusuf,  'UAE Passport',            'Identity', 'N2468101', date '2026-08-05', 75,  'seed'),
    (fid, m_yusuf,  'School ID',               'Education','SCH-998',  date '2026-06-30', 65,  'seed'),
    (fid, m_layla,  'UAE Passport',            'Identity', 'N1357911', date '2027-03-12', 100, 'seed'),
    (fid, m_layla,  'Health Insurance Card',   'Health',   'CIG-8833', date '2025-05-31', 0,   'seed'),
    (fid, m_family, 'Home Contents Insurance', 'Finance',  'HC-9922',  date '2026-07-15', 80,  'seed'),
    (fid, m_family, 'Car Insurance',           'Driving',  'CI-3344',  date '2026-07-22', 82,  'seed');

  -- Communications (subset of the fixture inbox; capture a few ids for task provenance)
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_yusuf, 'email', 'Greenwood International School <admin@greenwood.sch.ae>',
     'Weekly Newsletter: Parent-Teacher Meetings & Book Fair Deadline',
     'Parent-Teacher meetings are Tuesday May 26 (book via portal). Book Fair registration and reading selections due Friday May 22. Year 4 field trip consent slip must be returned signed by Friday afternoon.',
     'Education', '🏫', timestamptz '2026-05-18 09:00+04', false) returning id into c_school;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_family, 'email', 'Cigna Global Health <renewals@cigna.com>',
     'URGENT: Family Health Insurance Renewal Notice',
     'Your family health insurance policy (Policy #CG-998877) will renew in 30 days on June 18, 2026. Action required to confirm benefits or switch plans before automatic renewal.',
     'Insurance', '🛡️', timestamptz '2026-05-19 08:30+04', false) returning id into c_cigna;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_ahmed, 'email', 'GDRFA Dubai <no-reply@gdrfad.gov.ae>',
     'Residency Visa Renewal Appointment Confirmed',
     'Your residency visa renewal biometrics appointment is confirmed for May 24, 2026 at 9:00 AM at Al Manara Centre. Bring original passport, 4 photos, signed NOC sponsor letter.',
     'Admin', '🛂', timestamptz '2026-05-19 07:45+04', false) returning id into c_visa;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_yusuf, 'email', 'Greenwood Year 4 Coordinator <y4trip@greenwood.sch.ae>',
     'Year 4 Adventure Camp - Consent and Payment Due Next Wednesday',
     'Year 4 overnight trip to Hatta. Total cost AED 250 due by Wednesday May 27. Submit signed consent form and medical questionnaire to the class teacher.',
     'Education', '⛺', timestamptz '2026-05-17 12:00+04', false) returning id into c_trip;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_family, 'email', 'Greenwood Accounts Office <finance@greenwood.sch.ae>',
     'Term 3 Tuition Fees Invoice - Due in 14 Days',
     'Term 3 tuition fees invoice generated. Total AED 24,500 payable by June 2, 2026. 5% late fee after the deadline.',
     'Finance', '💵', timestamptz '2026-05-18 10:00+04', false);

  -- Tasks (with provenance to communications where applicable)
  insert into tasks (family_id, member_id, source_comm_id, title, priority, due_date) values
    (fid, m_ahmed,  c_school, 'Return signed Year 4 trip permission consent slip', 'high',   date '2026-05-22'),
    (fid, m_sara,   c_school, 'Register for Book Fair and submit reading selections', 'high', date '2026-05-22'),
    (fid, m_sara,   c_school, 'Book Parent-Teacher meeting slot in school portal',  'medium', date '2026-05-25'),
    (fid, m_ahmed,  c_cigna,  'Review and confirm family health insurance renewal', 'high',   date '2026-06-18'),
    (fid, m_ahmed,  c_visa,   'Attend residency visa biometrics at Al Manara Centre','high',   date '2026-05-24'),
    (fid, m_ahmed,  c_trip,   'Pay AED 250 for Year 4 overnight camp',               'medium', date '2026-05-27'),
    (fid, m_sara,   c_trip,   'Submit signed consent + medical questionnaire',       'medium', date '2026-05-27'),
    (fid, m_ahmed,  null,     'Pay Term 3 school tuition fees (AED 24,500)',          'high',   date '2026-06-02');

  -- School results (so "Yusuf's last result" is answerable)
  insert into school_results (family_id, member_id, subject, term, grade, numeric_score, result_date) values
    (fid, m_yusuf, 'Mathematics', 'Term 2', 'A',  92, date '2026-04-10'),
    (fid, m_yusuf, 'English',     'Term 2', 'B+', 86, date '2026-04-12'),
    (fid, m_yusuf, 'Science',     'Term 2', 'A-', 89, date '2026-05-02'),
    (fid, m_layla, 'Early Literacy', 'Term 2', 'Exceeding', null, date '2026-04-15');
end;
$$;

-- On sign-up: create the family + app user, seed demo data for that family.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  insert into public.families (name)
  values (coalesce(new.raw_user_meta_data ->> 'family_name', 'My Family'))
  returning id into fid;

  insert into public.users (id, family_id, email, role)
  values (new.id, fid, new.email, 'owner');

  perform public.seed_demo_family(fid);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
