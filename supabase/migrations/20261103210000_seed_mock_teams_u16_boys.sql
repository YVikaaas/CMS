-- Mock teams + members for BB Championship December / Basketball / Boys U16.

with csc as (
  select csc.id
  from public.competition c
  join public.competition_sport_map csm
    on csm.competition_id = c.id and csm.deleted_at is null
  join public.sport s on s.id = csm.sport_id
  join public.competition_sport_category_map csc
    on csc.competition_sport_id = csm.id and csc.deleted_at is null
  join public.category cat on cat.id = csc.category_id
  where c.deleted_at is null
    and c.name = 'BB Championship December'
    and s.name = 'Basketball'
    and cat.gender = 'male'
    and cat.age_group = 'U16'
  limit 1
),
ins_teams as (
  insert into public.team (
    competition_sport_category_map_id,
    name,
    org_name,
    gender
  )
  select
    csc.id,
    v.name,
    v.org_name,
    'male'
  from csc
  cross join (
    values
      ('Delhi Dynamos', 'Delhi Basketball Club'),
      ('Mumbai Mavericks', 'Mumbai Basketball Club'),
      ('Pune Panthers', 'Pune Basketball Club'),
      ('Jaipur Jaguars', 'Jaipur Basketball Club')
  ) as v(name, org_name)
  where not exists (
    select 1
    from public.team t
    where t.competition_sport_category_map_id = csc.id
      and lower(t.name) = lower(v.name)
      and t.deleted_at is null
  )
  returning id, name
)
insert into public.team_member (team_id, name, phone, gender)
select t.id, m.name, m.phone, 'male'
from ins_teams t
join (
  values
    ('Delhi Dynamos', 'Aarav Sharma', '9876501101'),
    ('Delhi Dynamos', 'Rohan Gupta', '9876501102'),
    ('Delhi Dynamos', 'Kabir Mehta', '9876501103'),
    ('Delhi Dynamos', 'Ishaan Verma', '9876501104'),
    ('Delhi Dynamos', 'Vivaan Joshi', '9876501105'),
    ('Delhi Dynamos', 'Arjun Nair', '9876501106'),
    ('Mumbai Mavericks', 'Advait Patel', '9876501201'),
    ('Mumbai Mavericks', 'Devansh Shah', '9876501202'),
    ('Mumbai Mavericks', 'Yash Kulkarni', '9876501203'),
    ('Mumbai Mavericks', 'Neil Desai', '9876501204'),
    ('Mumbai Mavericks', 'Harsh Malhotra', '9876501205'),
    ('Pune Panthers', 'Siddharth Rao', '9876501301'),
    ('Pune Panthers', 'Omkar Jadhav', '9876501302'),
    ('Pune Panthers', 'Atharv Bhosale', '9876501303'),
    ('Pune Panthers', 'Rudra Kamble', '9876501304'),
    ('Pune Panthers', 'Parth Shinde', '9876501305'),
    ('Jaipur Jaguars', 'Lakshya Singh', '9876501401'),
    ('Jaipur Jaguars', 'Reyansh Chauhan', '9876501402'),
    ('Jaipur Jaguars', 'Dhruv Rathore', '9876501403'),
    ('Jaipur Jaguars', 'Kunal Shekhawat', '9876501404'),
    ('Jaipur Jaguars', 'Mohit Yadav', '9876501405'),
    ('Jaipur Jaguars', 'Anuj Sharma', '9876501406')
) as m(team_name, name, phone) on m.team_name = t.name
where not exists (
  select 1
  from public.team_member existing
  where lower(existing.name) = lower(m.name)
    and existing.phone = m.phone
    and existing.deleted_at is null
);
