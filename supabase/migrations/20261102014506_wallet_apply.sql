-- The only way to change XP / coins: writes a ledger row and updates the wallet in one
-- transaction. Callable by the server (service_role) only. Streak logic arrives in S22.

create function public.wallet_apply(
  p_user_id uuid,
  p_xp_delta integer,
  p_coins_delta integer,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  -- Lock the wallet row so concurrent rewards cannot interleave
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata)
  values (p_user_id, p_xp_delta, p_coins_delta, p_reason, p_idempotency_key, p_metadata)
  on conflict (user_id, idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;

  -- Same key seen before: already applied, nothing to do
  if v_inserted = 0 then
    return false;
  end if;

  -- CHECK constraints reject a negative balance and roll everything back
  update public.wallets
  set xp = xp + p_xp_delta, coins = coins + p_coins_delta
  where user_id = p_user_id;

  return true;
end;
$$;

revoke execute on function public.wallet_apply from public, anon, authenticated;
grant execute on function public.wallet_apply to service_role;
