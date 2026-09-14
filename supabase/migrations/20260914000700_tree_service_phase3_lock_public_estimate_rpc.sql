revoke all on function public.get_public_operate_estimate(uuid) from public, anon, authenticated;
grant execute on function public.get_public_operate_estimate(uuid) to service_role;

revoke all on function public.accept_public_operate_estimate(uuid) from public, anon, authenticated;
grant execute on function public.accept_public_operate_estimate(uuid) to service_role;
