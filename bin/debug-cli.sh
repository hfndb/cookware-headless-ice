#!/bin/bash

DIR=`dirname $0`
$DIR/../node_modules/node/bin/node \
	--preserve-symlinks \
	inspect \
	$DIR/../dist/static/js/index.js $1 $2 $3 $4
