DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_reset ADD COLUMN token character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column token already exists in sys_reset.';
        END;
    END;
$$
