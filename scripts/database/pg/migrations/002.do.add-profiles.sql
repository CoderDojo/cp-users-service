DROP TABLE IF EXISTS cd_profiles;

CREATE TABLE cd_profiles
(
  id character varying,
  parent_guardian_id character varying,
  name character varying,
  dob date,
  gender character varying,
  email character varying NOT NULL,
  phone character varying,
  CONSTRAINT pk_parent_guardian_profile_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
