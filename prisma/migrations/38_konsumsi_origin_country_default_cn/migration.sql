-- Data fix: VIU Konsumsi products of SUBMITTED applications (anything past DRAFT) that have no Negara Asal
-- at all get REP. RAKYAT CINA (ISO "CN"), as instructed by the Project Manager. Only products where EVERY
-- origin field is empty are touched (originCountries, originCountryNames, productSnapshot's
-- countryOfOriginNames and the legacy single-value countryOfOrigin); drafts and every other product are
-- unchanged. Each filled product is marked "originCountryAutoFilled": true so it stays traceable and can
-- be corrected later (the app shows it as "diisi sistem").

UPDATE "application" AS a
SET "payload" = jsonb_set(
  a."payload",
  '{konsumsiProducts}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t.p -> 'originCountries') = 'array' THEN t.p -> 'originCountries' END), 0) = 0
         AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t.p -> 'originCountryNames') = 'array' THEN t.p -> 'originCountryNames' END), 0) = 0
         AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t.p -> 'productSnapshot' -> 'countryOfOriginNames') = 'array' THEN t.p -> 'productSnapshot' -> 'countryOfOriginNames' END), 0) = 0
         AND COALESCE(t.p ->> 'countryOfOrigin', '') = ''
        THEN t.p || jsonb_build_object(
          'originCountries', '["CN"]'::jsonb,
          'originCountryNames', '["REP. RAKYAT CINA"]'::jsonb,
          'originCountryAutoFilled', true
        )
        ELSE t.p
      END
      ORDER BY t.ord
    )
    FROM jsonb_array_elements(a."payload" -> 'konsumsiProducts') WITH ORDINALITY AS t(p, ord)
  )
)
WHERE a."status" <> 'DRAFT'
  AND jsonb_typeof(a."payload" -> 'konsumsiProducts') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(a."payload" -> 'konsumsiProducts') AS e(p)
    WHERE COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(e.p -> 'originCountries') = 'array' THEN e.p -> 'originCountries' END), 0) = 0
      AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(e.p -> 'originCountryNames') = 'array' THEN e.p -> 'originCountryNames' END), 0) = 0
      AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(e.p -> 'productSnapshot' -> 'countryOfOriginNames') = 'array' THEN e.p -> 'productSnapshot' -> 'countryOfOriginNames' END), 0) = 0
      AND COALESCE(e.p ->> 'countryOfOrigin', '') = ''
  );
