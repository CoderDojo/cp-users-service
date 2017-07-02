DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN init_user_type character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column init_user_type already exists in sys_user.';
        END;
    END;
$$