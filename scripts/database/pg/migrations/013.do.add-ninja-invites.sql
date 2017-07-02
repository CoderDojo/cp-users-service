DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN ninja_invites json[];
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column ninja_invites already exists in cd_profiles.';
        END;
    END;
$$