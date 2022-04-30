#!/bin/bash

# Cli options: https://nodejs.org/api/cli.html

DIR=`dirname $0`
node \
	--preserve-symlinks \
	--inspect-brk \
	--require ts-node/register \
	$DIR/../dist/static/js/index.js $1 $2 $3 $4
