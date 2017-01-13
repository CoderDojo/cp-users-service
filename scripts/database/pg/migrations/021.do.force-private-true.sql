DO $$
    BEGIN
        BEGIN
          UPDATE cd_profiles SET private = true WHERE private IS NULL;
        END;
    END;
$$
