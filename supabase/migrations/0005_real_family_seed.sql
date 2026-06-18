-- Real-family support:
-- 1. handle_new_user no longer auto-seeds the Hassan demo dataset — a real
--    sign-up now gets a CLEAN family (members/docs added in-app or seeded explicitly).
-- 2. seed_diogo_family() — the user's own roster + a tailored starter scenario.
--    (REFERENCE_DATE for the POC is 2026-05-19; ages/expiries are relative to that.)

-- Clean family on real registration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  insert into public.families (name)
  values (coalesce(new.raw_user_meta_data ->> 'family_name', 'My Family'))
  returning id into fid;
  insert into public.users (id, family_id, email, role) values (new.id, fid, new.email, 'owner');
  return new;  -- no demo seed; families start empty
end;
$$;

create or replace function public.seed_diogo_family(fid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m_diogo uuid; m_alana uuid; m_bella uuid; m_noah uuid; m_ayla uuid; m_family uuid;
  c_bella uuid; c_noah uuid; c_ayla uuid; c_health uuid; c_fees uuid; c_ins uuid;
begin
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Diogo', 'adult', 'Parent 1', date '1986-06-10', null, '👨‍💻', '#6366f1',
          array['diogo','dad','papa','father','dado']) returning id into m_diogo;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Alana', 'adult', 'Parent 2', date '1988-09-14', null, '👩', '#f43f5e',
          array['alana','mum','mom','mama','mother']) returning id into m_alana;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Bella', 'child', 'Child 1', date '2016-03-15', 'Year 5', '👧', '#f59e0b',
          array['bella','isabella','bels']) returning id into m_bella;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Noah', 'child', 'Child 2', date '2019-02-10', 'Year 2', '👦', '#10b981',
          array['noah','noa']) returning id into m_noah;
  insert into family_members (family_id, name, member_type, role, date_of_birth, grade, avatar, color, aliases)
  values (fid, 'Ayla', 'child', 'Child 3', date '2023-04-20', 'Starting school Sep 2026', '👶', '#a855f7',
          array['ayla','aila','aylah']) returning id into m_ayla;
  insert into family_members (family_id, name, member_type, role, avatar, color, aliases)
  values (fid, 'Family', 'household', 'Household', '🏡', '#14b8a6',
          array['family','household','home','us']) returning id into m_family;

  insert into documents (family_id, member_id, title, category, document_number, expiry_date, progress, source_channel) values
    (fid, m_diogo,  'Passport',                'Identity', 'P-DIOGO-01', date '2026-06-28', 20,  'seed'),
    (fid, m_diogo,  'Driving Licence',         'Driving',  'DL-DIOGO-7', date '2027-01-15', 100, 'seed'),
    (fid, m_alana,  'Passport',                'Identity', 'P-ALANA-02', date '2025-09-30', 0,   'seed'),
    (fid, m_bella,  'Passport',                'Identity', 'P-BELLA-03', date '2028-04-10', 100, 'seed'),
    (fid, m_bella,  'School ID',               'Education','SCH-BELLA',  date '2026-07-31', 60,  'seed'),
    (fid, m_noah,   'Passport',                'Identity', 'P-NOAH-04',  date '2026-08-20', 40,  'seed'),
    (fid, m_noah,   'School ID',               'Education','SCH-NOAH',   date '2026-07-31', 60,  'seed'),
    (fid, m_ayla,   'Passport',                'Identity', 'P-AYLA-05',  date '2029-02-01', 100, 'seed'),
    (fid, m_ayla,   'Birth Certificate',       'Identity', 'BC-AYLA-05', null,              100, 'seed'),
    (fid, m_family, 'Health Insurance',        'Health',   'HI-FAM-09',  date '2026-06-15', 0,   'seed'),
    (fid, m_family, 'Car Insurance',           'Driving',  'CI-FAM-10',  date '2026-07-22', 70,  'seed'),
    (fid, m_family, 'Home Contents Insurance', 'Finance',  'HC-FAM-11',  date '2026-09-01', 90,  'seed');

  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_bella, 'email', 'Oakwood Primary School <admin@oakwood.sch>', 'Year 5 — Residential Trip Consent & Parents Evening',
     'Year 5 residential trip to the activity centre: signed consent form and GBP 180 payment due by 30 May. Parents evening bookings open for 28 May via the portal.',
     'Education', '🏫', timestamptz '2026-05-18 09:00+04', false) returning id into c_bella;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_noah, 'email', 'Oakwood Primary School <admin@oakwood.sch>', 'Year 2 — Reading Log & Phonics Check',
     'Please verify and submit Noah''s weekly reading log by Thursday 21 May. The Year 2 phonics screening takes place the week of 1 June.',
     'Education', '📚', timestamptz '2026-05-19 08:30+04', false) returning id into c_noah;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_ayla, 'email', 'Little Acorns Reception <admissions@littleacorns.sch>', 'Reception Place Confirmed — Starting September 2026',
     'We are delighted to confirm Ayla''s reception place starting 3 September 2026. Please complete the enrolment pack and provide a copy of her birth certificate and immunisation records by 15 July.',
     'Education', '🎒', timestamptz '2026-05-16 10:00+04', false) returning id into c_ayla;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_family, 'email', 'City Pediatric Clinic <reception@citypeds.clinic>', 'Annual Health Checks Due — Bella, Noah & Ayla',
     'Annual pediatric health checks are due for all three children. Please book appointments and bring the health insurance card to each visit.',
     'Health', '🩺', timestamptz '2026-05-19 07:45+04', false) returning id into c_health;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_family, 'email', 'Oakwood Accounts <finance@oakwood.sch>', 'Summer Term Tuition Invoice — Due 2 June',
     'The summer term tuition invoice for Bella and Noah totals GBP 6,400, payable by 2 June. A late fee applies after the due date.',
     'Finance', '💵', timestamptz '2026-05-18 11:00+04', false) returning id into c_fees;
  insert into communications (family_id, member_id, channel, sender, subject, body, category, icon, received_at, read) values
    (fid, m_family, 'email', 'ShieldHealth <renewals@shieldhealth.com>', 'Family Health Insurance Renewal — 15 June',
     'Your family health insurance renews on 15 June. Please confirm the plan or switch options before the renewal date to avoid a coverage gap.',
     'Insurance', '🛡️', timestamptz '2026-05-19 08:00+04', false) returning id into c_ins;

  -- member_id = the person the task CONCERNS (child / household), so per-child
  -- views and "tasks for <child>" queries work. Shared items go to Family.
  insert into tasks (family_id, member_id, source_comm_id, title, priority, due_date) values
    (fid, m_bella,  c_bella, 'Sign Bella''s Year 5 trip consent + pay GBP 180', 'high',   date '2026-05-30'),
    (fid, m_bella,  c_bella, 'Book Year 5 parents evening slot',                'medium', date '2026-05-28'),
    (fid, m_noah,   c_noah,  'Submit Noah''s weekly reading log',               'high',   date '2026-05-21'),
    (fid, m_ayla,   c_ayla,  'Complete Ayla''s reception enrolment pack',       'medium', date '2026-07-15'),
    (fid, m_ayla,   c_ayla,  'Provide Ayla''s birth cert + immunisation records','medium',date '2026-07-15'),
    (fid, m_family, c_health,'Book annual health checks for the three kids',    'medium', date '2026-05-26'),
    (fid, m_family, c_fees,  'Pay summer term tuition (GBP 6,400)',             'high',   date '2026-06-02'),
    (fid, m_family, c_ins,   'Confirm family health insurance renewal',         'high',   date '2026-06-15');

  insert into school_results (family_id, member_id, subject, term, grade, numeric_score, result_date) values
    (fid, m_bella, 'Mathematics', 'Spring', 'A',  91, date '2026-04-08'),
    (fid, m_bella, 'English',     'Spring', 'A-', 88, date '2026-04-10'),
    (fid, m_bella, 'Science',     'Spring', 'B+', 85, date '2026-05-04'),
    (fid, m_noah,  'Mathematics', 'Spring', 'Exceeding', null, date '2026-04-09'),
    (fid, m_noah,  'Reading',     'Spring', 'Meeting',   null, date '2026-04-11');
end;
$$;
