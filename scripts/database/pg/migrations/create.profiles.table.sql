DROP TABLE IF EXISTS parent_guardian_profiles;

CREATE TABLE cd_parentguardianprofiles
(
  id character varying,
  name character varying,
  dob date,
  email character varying NOT NULL,
  children character varying [],
  phone character varying,
  CONSTRAINT pk_parent_guardian_profile_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

DROP TABLE IF EXISTS youth_profiles;

CREATE TABLE cd_youthprofiles
(
  id character varying,
  name character varying,
  dob date,
  email character varying,
  parents character varying [],
  CONSTRAINT pk_youth_profile_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
