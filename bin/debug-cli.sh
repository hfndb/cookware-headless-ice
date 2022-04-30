#!/bin/bash

DIR=`dirname $0`
node \
	--preserve-symlinks \
	inspect \
	$DIR/../dist/static/js/index.js $1 $2 $3 $4
