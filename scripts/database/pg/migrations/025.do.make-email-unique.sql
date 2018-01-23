DO $$
  BEGIN
    BEGIN
      CREATE UNIQUE INDEX sys_user_unique_email ON sys_user(email) WHERE email != '';
    END;
    BEGIN
      CREATE UNIQUE INDEX cd_profiles_unique_email ON cd_profiles(email) WHERE email != '';
    END;
  END;
$$
