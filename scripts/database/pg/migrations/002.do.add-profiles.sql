DROP TABLE IF EXISTS cd_parentguardianprofiles;

CREATE TABLE cd_parentguardianprofiles
(
  id character varying,
  parent_guardian_id character varying,
  name character varying,
  dob date,
  gender character varying,
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
  youth_id character varying,
  name character varying,
  dob date,
  gender character varying,
  email character varying,
  parents character varying [],
  CONSTRAINT pk_youth_profile_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);