-- Historical production migration. Dependency checks and a two-row backup were
-- completed before the obsolete table was removed. CASCADE is intentionally
-- omitted so an unexpected dependency stops a fresh replay safely.
drop table if exists public.pautan_kad;
