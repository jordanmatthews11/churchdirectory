alter table public.members
add column if not exists display_order integer not null default 0;

with ordered_members as (
  select
    id,
    row_number() over (
      partition by family_id
      order by
        case role
          when 'adult' then 0
          when 'child' then 1
          else 2
        end,
        created_at,
        id
    ) - 1 as next_display_order
  from public.members
)
update public.members as members
set display_order = ordered_members.next_display_order
from ordered_members
where members.id = ordered_members.id;
