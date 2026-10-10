-- Data fix: the CN row of country_master_data was renamed from "Tiongkok" to "REP. RAKYAT CINA", but
-- data saved earlier still carries the old name.
--
-- 1. VIU Konsumsi products saved in the old single-country shape (countryOfOrigin / countryOfOriginCode,
--    no originCountries array) get the current arrays: originCountries = [countryOfOriginCode] and
--    originCountryNames = [countryOfOrigin], so every reader sees their Negara Asal (some read the raw
--    payload and showed it empty). Products that already have originCountries are not touched here.
-- 2. Every JSON string value exactly equal to "Tiongkok" in application payloads becomes
--    "REP. RAKYAT CINA" (Konsumsi originCountryNames / snapshot names, VKI products countryOfOrigin,
--    brand countries). Only whole values are replaced — free text containing the word is left as is.
-- 3. Merek Management: merk.countryOfOrigin and merk_ownership.ownerCountryCode equal to "Tiongkok" become "REP. RAKYAT CINA".

UPDATE "application" AS a
SET "payload" = jsonb_set(
  a."payload",
  '{konsumsiProducts}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t.p -> 'originCountries') = 'array' THEN t.p -> 'originCountries' END), 0) = 0
         AND COALESCE(t.p ->> 'countryOfOriginCode', '') <> ''
        THEN t.p || jsonb_build_object(
          'originCountries', jsonb_build_array(t.p ->> 'countryOfOriginCode'),
          'originCountryNames', jsonb_build_array(COALESCE(NULLIF(t.p ->> 'countryOfOrigin', ''), t.p ->> 'countryOfOriginCode'))
        )
        ELSE t.p
      END
      ORDER BY t.ord
    )
    FROM jsonb_array_elements(a."payload" -> 'konsumsiProducts') WITH ORDINALITY AS t(p, ord)
  )
)
WHERE jsonb_typeof(a."payload" -> 'konsumsiProducts') = 'array'
  AND jsonb_array_length(a."payload" -> 'konsumsiProducts') > 0
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(a."payload" -> 'konsumsiProducts') AS e(p)
    WHERE COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(e.p -> 'originCountries') = 'array' THEN e.p -> 'originCountries' END), 0) = 0
      AND COALESCE(e.p ->> 'countryOfOriginCode', '') <> ''
  );

UPDATE "application"
SET "payload" = replace("payload"::text, '"Tiongkok"', '"REP. RAKYAT CINA"')::jsonb
WHERE "payload"::text LIKE '%"Tiongkok"%';

UPDATE "merk" SET "countryOfOrigin" = 'REP. RAKYAT CINA' WHERE "countryOfOrigin" = 'Tiongkok';
UPDATE "merk_ownership" SET "ownerCountryCode" = 'REP. RAKYAT CINA' WHERE "ownerCountryCode" = 'Tiongkok';
