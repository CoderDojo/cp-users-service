#!/bin/bash
isExistApp=`pgrep cp-users-service`
if [[ -n $isExistApp ]]; then
  service cp-users-service stop
fi
