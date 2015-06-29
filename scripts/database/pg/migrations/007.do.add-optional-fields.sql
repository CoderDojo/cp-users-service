DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN optional_hidden_fields json;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column optional_hidden_fields already exists in cd_profiles.';
        END;
    END;
$$