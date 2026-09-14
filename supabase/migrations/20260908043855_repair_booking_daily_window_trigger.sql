-- Repair guard: ensure the daily booking window is always enforced on writes.
drop trigger if exists enforce_booking_daily_window on public.tempahan;
create trigger enforce_booking_daily_window
before insert or update on public.tempahan
for each row execute function public.enforce_booking_daily_window();
