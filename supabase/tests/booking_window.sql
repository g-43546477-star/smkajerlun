-- Read-only boundary checks against the same function used by the trigger.
-- Empty result means all cases passed.
select * from (
  values
    ('2026-09-09'::date, '2026-09-08 14:59:59+08'::timestamptz, false),
    ('2026-09-09', '2026-09-08 15:00:00+08', true),
    ('2026-09-10', '2026-09-08 15:00:00+08', false),
    ('2026-09-10', '2026-09-09 14:59:59+08', false),
    ('2026-09-10', '2026-09-09 15:00:00+08', true),
    ('2026-09-09', '2026-09-09 00:00:00+08', true),
    ('2026-09-08', '2026-09-09 00:00:00+08', false)
) cases(booking_date, at_time, expected)
where public.booking_date_is_open(booking_date, at_time) is distinct from expected;
