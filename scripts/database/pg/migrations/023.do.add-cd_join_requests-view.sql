DO $$
    BEGIN
      CREATE OR REPLACE VIEW cd_v_join_requests AS
      (SELECT join_request->>'id' AS id,
        user_id,
        join_request->>'dojoId' AS dojo_id,
        join_request->>'userType' AS user_type,
        join_request->>'timestamp' AS timestamp
        FROM (select unnest(join_requests) AS join_request, user_id  FROM cd_user_profile) x);
    END;
$$
