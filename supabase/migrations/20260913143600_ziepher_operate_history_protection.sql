-- Operational history should be canceled/archived, not silently deleted.
-- Draft estimate line items remain directly editable/removable while an estimate is prepared.

revoke delete on public.estimates, public.jobs, public.appointments from authenticated;
