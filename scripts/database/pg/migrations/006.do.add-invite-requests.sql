DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN invite_requests character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column invite_requests already exists in cd_profiles.';
        END;
    END;
$$