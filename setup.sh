#! /bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd );
FILE="$DIR/config/$1".env

USAGE="Usage: ./setup.sh <config>"

if [ ! -r $FILE ] ; then
  echo "config file not found"
  echo $USAGE
  exit 1
fi

source $FILE

if [ $DOCKER_HOST ] ; then
    # extract the protocol
    proto="$(echo $DOCKER_HOST | grep :// | sed -e's,^\(.*://\).*,\1,g')"

    # remove the protocol
    url="$(echo ${DOCKER_HOST/$proto/})"

    #remove port from url
    LOCAL_HOST=${url%:*}
  else
    if [ $TARGETIP ] ; then
      LOCAL_HOST=$TARGETIP
    else
      LOCAL_HOST="127.0.0.1"
    fi
  fi

if [ $POSTGRES_HOST ] ; then
	PG_HOST=$POSTGRES_HOST
else
  PG_HOST=$LOCAL_HOST
fi

if [ ! $POSTGRES_PORT ] ; then
  PG_PORT=5432
else
  PG_PORT=$POSTGRES_PORT
fi


psql --single-transaction -h $PG_HOST -U $POSTGRES_USERNAME -d $POSTGRES_NAME -f $DIR/scripts/database/pg/create-schema.sql --port $PG_PORT

psql --single-transaction -h $PG_HOST -U $POSTGRES_USERNAME -d $POSTGRES_NAME -f $DIR/scripts/database/pg/populate-users.sql --port $PG_PORT


echo "-------------------------------------------------------"
echo "----------Finished initializating users DB & ES--------"
echo "-------------------------------------------------------"