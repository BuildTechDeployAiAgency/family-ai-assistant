-- Every new family gets a shared "Family" household member on signup.
-- Without it a brand-new user (e.g. Mario) has a completely empty roster, so
-- shared documents/tasks have nothing to belong to and the scan owner picker
-- is empty. The household member gives a sensible default owner out of the box;
-- users add their own people via the in-app "Add member" flow.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  insert into public.families (name)
  values (coalesce(new.raw_user_meta_data ->> 'family_name', 'My Family'))
  returning id into fid;
  insert into public.users (id, family_id, email, role) values (new.id, fid, new.email, 'owner');

  -- Shared household owner (matches the seed's "Family" member shape/aliases).
  insert into public.family_members (family_id, name, member_type, role, avatar, color, aliases)
  values (fid, 'Family', 'household', 'Household', '🏡', '#14b8a6',
          array['family', 'household', 'home', 'us', 'everyone']);

  return new;
end;
$$;

-- Backfill: give existing families that have no household member one too.
insert into public.family_members (family_id, name, member_type, role, avatar, color, aliases)
select f.id, 'Family', 'household', 'Household', '🏡', '#14b8a6',
       array['family', 'household', 'home', 'us', 'everyone']
from public.families f
where not exists (
  select 1 from public.family_members m
  where m.family_id = f.id and m.member_type = 'household'
);
