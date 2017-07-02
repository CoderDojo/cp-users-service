DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN avatar json;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column avatar already exists in cd_profiles.';
        END;
    END;
$$
