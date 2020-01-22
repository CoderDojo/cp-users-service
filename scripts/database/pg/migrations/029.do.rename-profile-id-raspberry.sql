DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE sys_user RENAME COLUMN profile_id TO raspberry_id;
        EXCEPTION
            WHEN invalid_column_reference THEN RAISE NOTICE 'column profile_id not found.';
        END;
    END;
$$
