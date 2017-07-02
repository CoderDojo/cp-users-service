DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN parent_invites json[];
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column parent_invites already exists in cd_profiles.';
        END;
    END;
$$
