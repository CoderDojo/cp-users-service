DO $$
    BEGIN
        BEGIN
          UPDATE cd_profiles SET private = true WHERE private IS NULL;
        END;
        BEGIN
          ALTER TABLE cd_profiles ALTER COLUMN private SET NOT NULL;
        END;
    END;
$$
