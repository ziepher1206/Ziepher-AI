revoke all on function public.submit_public_operate_lead(uuid,uuid,text,text,text,text,text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.submit_public_operate_lead(uuid,uuid,text,text,text,text,text,text,text,text,boolean) to service_role;
