DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN profile_id character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column profile_id already exists in sys_user.';
        END;
    END;
$$
