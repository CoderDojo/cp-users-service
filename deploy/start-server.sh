#!/bin/bash
isExistApp=`ps -eaf |grep cp-users-service |grep -v grep| awk '{ print $2; }'`
if [[ -n $isExistApp ]]; then
    service cp-users-service stop
fi

service cp-users-service start
