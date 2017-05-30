DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN user_type character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column user_type already exists in cd_profiles.';
        END;
    END;
$$
