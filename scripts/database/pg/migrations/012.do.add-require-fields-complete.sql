DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN required_fields_complete boolean DEFAULT FALSE;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column required_fields_complete already exists in cd_profiles.';
        END;
    END;
$$
