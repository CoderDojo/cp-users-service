#! /bin/bash

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )";
SCRIPT=$(basename "${BASH_SOURCE[0]}")
USAGE="Usage: ./$SCRIPT <config>"

source "$PROJECT_DIR/scripts/exec_on_env.sh"

function system_params {

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

}

function postgres_test_data {
    psql --single-transaction -h $PG_HOST -U $POSTGRES_USERNAME -d $POSTGRES_NAME -f "$PROJECT_DIR/scripts/database/pg/populate-users.sql" --port $PG_PORT
}

function delete_elasticsearch_index {
    echo "Deleting '$ES_INDEX' index"
    curl -XDELETE "http://$LOCAL_HOST:9200/'$ES_INDEX?pretty"
}

function test_data {
    #this inserts the two test users admin@example.com & manager@example.com
    #this is not done in zen-platform anymore
    run_js "$PROJECT_DIR/scripts/insert-test-users.js"
}

system_params
postgres_test_data
delete_elasticsearch_index
test_data

echo "-------------------------------------------------------"
echo "-------Finished initializating countries DB & ES-------"
echo "-------------------------------------------------------"
