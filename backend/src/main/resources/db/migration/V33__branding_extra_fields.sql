-- Master spec section 5's original BrandingSettings model was "logo,
-- platform name, school name, school label, subtitle, colors" -- only
-- logo/preset/primary_color were ever actually built (V10). Adding the
-- rest now to match the reference site's branding modal: platform_name
-- (override for the app's own display name, e.g. "سِجِلّ"), school_name
-- (the deploying school's own name), school_label (shown under the school
-- name on print templates), subtitle (shown under the platform name), and
-- accent_color (a second color alongside primary_color, e.g. for
-- warning/reject-style UI elements).
alter table branding_setting
    add column platform_name  text,
    add column school_name    text,
    add column school_label   text,
    add column subtitle       text,
    add column accent_color   varchar(7) not null default '#8B2635';
