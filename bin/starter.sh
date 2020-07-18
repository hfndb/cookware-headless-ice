#!/bin/bash

# export DEBUG=express:*		# Set debug on for Express
# Cli options: https://nodejs.org/api/cli.html

# This file isn't really necessary at this time, but since future usage might require setting of environment variables it's better te be prepaeed.

DIR=`dirname $0`
$DIR/../node_modules/node/bin/node \
	--preserve-symlinks \
	$DIR/../dist/static/js/index.js $1 $2 $3 $4
# node --preserve-symlinks $DIR/../dist/static/js/index.js $1 $2 $3 $4

# unset DEBUG
