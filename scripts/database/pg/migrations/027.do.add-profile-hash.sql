DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN profile_password character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column profile_password already exists in sys_user.';
        END;
    END;
$$