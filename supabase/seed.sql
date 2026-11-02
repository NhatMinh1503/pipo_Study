-- Local development seed data. Never put real user data here.

insert into public.app_health (id, status, message)
values (1, 'ok', 'Hello pipo — database connected')
on conflict (id) do nothing;
