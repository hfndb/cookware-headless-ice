#!/bin/bash

# export DEBUG=express:*		# Set debug on for Express
# Cli options: https://nodejs.org/api/cli.html

# This file isn't really necessary at this time, but since future usage might require setting of environment variables it's better te be prepaeed.

# Get full path to this script
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

node \
	--preserve-symlinks \
	$SCRIPT_DIR/../src/index.mjs $1 $2 $3 $4
# node --preserve-symlinks ./src/index.js $1 $2 $3 $4

# unset DEBUG
