#! /bin/bash

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )";
SCRIPT=$(basename "${BASH_SOURCE[0]}")
USAGE="Usage: ./$SCRIPT <config>"

source "$PROJECT_DIR/scripts/exec_on_env.sh"

function test_data {
    #this inserts the two test users admin@example.com & manager@example.com
    #this is not done in zen-platform anymore
    run_js "$PROJECT_DIR/scripts/insert-test-users.js"
}

test_data

echo "-------------------------------------------------------"
echo "-------Finished initializating Users            -------"
echo "-------------------------------------------------------"
