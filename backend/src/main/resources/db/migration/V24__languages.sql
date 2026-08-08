-- Phase 9: admin-addable languages beyond the three built-in ones
-- (ar/en/hi, which stay exactly as they are — the existing translation
-- table's value_ar/value_en/value_hi columns are untouched by this
-- migration). 'language' tracks which extra languages an admin has added;
-- 'translation_extra_value' holds their translated strings, one row per
-- (key, language) pair, populated by AI translation when the language is
-- created. See decision-record.md D7 for why this is additive rather than
-- a full EAV redesign of the existing translation table.

create table language (
    code        varchar(10) primary key check (code not in ('ar', 'en', 'hi')),
    name        varchar(100) not null,
    direction   varchar(3) not null check (direction in ('ltr', 'rtl')),
    created_at  timestamptz not null default now()
);

-- UUID surrogate key rather than a composite (translation_key,
-- language_code) primary key -- every other entity in this codebase uses a
-- UUID id, no existing entity uses @IdClass/@EmbeddedId, so this stays
-- consistent rather than introducing the first composite-key entity.
create table translation_extra_value (
    id              uuid primary key default gen_random_uuid(),
    translation_key varchar(150) not null references translation(key) on delete cascade,
    language_code   varchar(10) not null references language(code) on delete cascade,
    value           text not null,
    updated_at      timestamptz not null default now(),
    unique (translation_key, language_code)
);

create index idx_translation_extra_value_language on translation_extra_value (language_code);
