#!/bin/bash

# Usage: benchmark.sh 1s -h

# Example:  cls; /opt/projects/weblib/bin/benchmark.sh 0.01s -w

# Sleep delay:
#     s for seconds (the default)
#     m for minutes.
#     h for hours.
#     d for days.

# Inspired by: https://stackoverflow.com/questions/1221555/retrieve-cpu-usage-and-memory-usage-of-a-single-process-on-linux

ACTIVE=1
FILE=/tmp/benchmark.txt
INTERVAL=$1

active() {
	TMP=`ps --no-headers -p "$1"`
	if [ "$TMP" = "" ]
	then
		ACTIVE=0
	fi
}

topp() (
  $* &
  pid="$!"
  trap ':' INT
  echo '%CPU  %MEM' > $FILE
  while sleep $INTERVAL && test $ACTIVE == 1
  do
	ps --no-headers -o '%cpu,%mem' -p "$pid" &>> $FILE
	active $pid
  done
  echo "Log file: $FILE"
  less $FILE
)

DIR=`dirname $0`
topp node --preserve-symlinks $DIR/../src/index.mjs $2 $3 $4 $5
