-- Object bytes were copied and SHA-256 verified before this cutover. Keep
-- storage_key unchanged; only the public bucket segment of persisted URLs
-- changes. The former sijill-app bucket remains available for rollback until
-- the new URLs have been exercised in production.
update attachment
set url = replace(url, '/sijill-app/', '/sijill-public/')
where url like '%/storage/v1/object/public/sijill-app/%';
