DO $$
    BEGIN
        BEGIN
            DROP VIEW cd_v_join_requests;
            DROP VIEW cd_user_profile;
        END;
        BEGIN
            ALTER TABLE cd_profiles DROP COLUMN countryname;
            ALTER TABLE cd_profiles DROP COLUMN countrynumber;
            ALTER TABLE cd_profiles DROP COLUMN county;
            ALTER TABLE cd_profiles DROP COLUMN continent;
            ALTER TABLE cd_profiles DROP COLUMN place;
            ALTER TABLE cd_profiles DROP COLUMN place_name;
            ALTER TABLE cd_profiles DROP COLUMN address;
            ALTER TABLE cd_profiles DROP COLUMN alpha2;
            ALTER TABLE cd_profiles DROP COLUMN alpha3;
            ALTER TABLE cd_profiles DROP COLUMN state;
            ALTER TABLE cd_profiles DROP COLUMN admin1_code;
            ALTER TABLE cd_profiles DROP COLUMN admin2_code;
            ALTER TABLE cd_profiles DROP COLUMN admin3_code;
            ALTER TABLE cd_profiles DROP COLUMN admin4_code;
            ALTER TABLE cd_profiles DROP COLUMN admin1_name;
            ALTER TABLE cd_profiles DROP COLUMN admin2_name;
            ALTER TABLE cd_profiles DROP COLUMN admin3_name;
            ALTER TABLE cd_profiles DROP COLUMN admin4_name;
        END;
        BEGIN
            CREATE OR REPLACE VIEW cd_user_profile AS SELECT
                cd_profiles.id AS profile_id,
                cd_profiles.name AS profile_name,
                cd_profiles.user_id,
                cd_profiles.alias,
                cd_profiles.dob,
                cd_profiles.country,
                cd_profiles.private,
                cd_profiles.gender,
                cd_profiles.last_edited,
                cd_profiles.email AS profile_email,
                cd_profiles.phone AS profile_phone,
                cd_profiles.parents,
                cd_profiles.children,
                cd_profiles.linkedin,
                cd_profiles.twitter,
                cd_profiles.languages_spoken,
                cd_profiles.programming_languages,
                cd_profiles.notes,
                cd_profiles.projects,
                cd_profiles.badges,
                cd_profiles.country->'countryName' as countryname,
                cd_profiles.country->'countryNumber' as countrynumber,
                cd_profiles.country->'continent' as continent,
                cd_profiles.country->'alpha2' as alpha2,
                cd_profiles.country->'alpha3' as alpha3,
                cd_profiles.user_type,
                cd_profiles.optional_hidden_fields,
                cd_profiles.avatar,
                cd_profiles.required_fields_complete,
                cd_profiles.ninja_invites,
                cd_profiles.parent_invites,
                sys_user.id,
                sys_user.nick,
                sys_user.email,
                sys_user.name,
                sys_user.username,
                sys_user.activated,
                sys_user.level,
                sys_user.mysql_user_id,
                sys_user.first_name,
                sys_user.last_name,
                sys_user.roles,
                sys_user.active,
                sys_user.phone,
                sys_user.mailing_list,
                sys_user.terms_conditions_accepted,
                sys_user.when,
                sys_user.confirmed,
                sys_user.confirmcode,
                sys_user.salt,
                sys_user.pass,
                sys_user.admin,
                sys_user.modified,
                sys_user.accounts,
                sys_user.locale,
                sys_user.banned,
                sys_user.ban_reason,
                sys_user.init_user_type,
                sys_user.join_requests,
                sys_user.last_login
            FROM sys_user JOIN cd_profiles ON sys_user.id = cd_profiles.user_id;
        END;
        BEGIN
            -- By making it depending on cd_profiles table, we avoid cross-dep w/ cd_user_profile
            -- The 2 DROP VIEW is a consequence of this dependency
            CREATE OR REPLACE VIEW cd_v_join_requests AS
            (SELECT join_request->>'id' AS id,
              id as user_id,
              join_request->>'dojoId' AS dojo_id,
              join_request->>'userType' AS user_type,
              join_request->>'timestamp' AS timestamp
              FROM (select unnest(join_requests) AS join_request, id  FROM sys_user) x);
        END;
    END;
$$
