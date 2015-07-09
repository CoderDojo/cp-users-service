DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN is_under_13 boolean DEFAULT false;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column is_under_13 already exists in sys_user.';
        END;
    END;
$$