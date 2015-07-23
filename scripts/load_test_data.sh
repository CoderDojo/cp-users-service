#! /bin/bash

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )";
SCRIPT=$(basename "${BASH_SOURCE[0]}")
USAGE="Usage: ./$SCRIPT <config>"

source "$PROJECT_DIR/scripts/exec_on_env.sh"

function postgres_test_data {
    psql --single-transaction -h $PG_HOST -U $POSTGRES_USERNAME -d $POSTGRES_NAME -f "$PROJECT_DIR/scripts/database/pg/populate-users.sql" --port $PG_PORT
}

function delete_elasticsearch_index {
    echo "Deleting '$ES_INDEX' index"
    curl -XDELETE "http://$ES_HOST:9200/'$ES_INDEX?pretty"
}

function test_data {
    #this inserts the two test users admin@example.com & manager@example.com
    #this is not done in zen-platform anymore
    run_js "$PROJECT_DIR/scripts/insert-test-users.js"
}

# Don't import this test users for now.
#postgres_test_data
delete_elasticsearch_index
test_data

echo "-------------------------------------------------------"
echo "-------Finished initializating countries DB & ES-------"
echo "-------------------------------------------------------"
