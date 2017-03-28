DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN first_name character varying, ADD COLUMN last_name character varying;
            UPDATE sys_user SET first_name = name WHERE last_name IS NULL;
            UPDATE sys_user SET first_name = substring(name, 0, char_length(name) - char_length(last_name)) WHERE name LIKE '% ' || last_name AND last_name IS NOT NULL;
            UPDATE sys_user SET first_name = name WHERE first_name IS NULL;
            UPDATE sys_user SET name = first_name || ' ' || last_name WHERE last_name IS NOT NULL;
            UPDATE sys_user SET name = first_name WHERE last_name IS NULL;
            UPDATE cd_profiles p SET name = (SELECT name FROM sys_user s WHERE p.user_id=s.id), first_name = (SELECT first_name FROM sys_user s WHERE p.user_id=s.id), last_name = (SELECT last_name FROM sys_user s WHERE p.user_id=s.id);
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'columns first_name, last_name already exist in sys_user.';
        END;
    END;
$$
