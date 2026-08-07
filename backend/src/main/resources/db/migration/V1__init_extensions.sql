-- Phase 1: migration tooling baseline only.
-- Entity tables (employee, department, permissions, audit log, etc.) land in Phase 2
-- per the build sequence in sijill-master-spec.md §10 and the "small phases" instruction in §11.

create extension if not exists "pgcrypto";  -- gen_random_uuid()
