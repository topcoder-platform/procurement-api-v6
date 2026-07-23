-- Recreate nanoid() without pgcrypto so dbgenerated("nanoid()") defaults
-- continue to work when pgcrypto is unavailable or installed outside the
-- application's search_path.
--
-- Parameters:
--   size - Number of characters to return. Defaults to the 14-character IDs
--          used by procurement tables.
-- Returns:
--   A URL-safe identifier string.
-- Usage:
--   Vendor, Contract, Invoice, and Renewal primary key defaults call nanoid()
--   during inserts when Prisma does not provide an explicit id.
-- Exceptions:
--   Raises an exception when size is null or less than one.
CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 14)
RETURNS text AS $$
DECLARE
  id text := '';
  i int := 0;
  urlAlphabet char(64) := 'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';
  randomHex text;
  byteValue int;
BEGIN
  IF size IS NULL OR size < 1 THEN
    RAISE EXCEPTION 'nanoid size must be >= 1';
  END IF;

  WHILE i < size LOOP
    randomHex := md5(random()::text || clock_timestamp()::text || i::text);
    byteValue := ('x' || substr(randomHex, 1, 2))::bit(8)::int;
    id := id || substr(urlAlphabet, (byteValue & 63) + 1, 1);
    i := i + 1;
  END LOOP;

  RETURN id;
END
$$ LANGUAGE PLPGSQL VOLATILE;
