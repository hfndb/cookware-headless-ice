#!/bin/bash

shopt -s globstar # switch bash globstar on
shopt -s extglob  # switch bash extended globbing on

function print_header {
	echo ""
	echo "-------------------------------------"
	echo $1
	echo "-------------------------------------"
}

function process {
	print_header $1
	# Syntax specific regular expressions here
	grep 'export let .* = {' $1
# 	grep 'let .* = {' $1
	grep '\.prototype' $1 # rare, but...
	grep '.*: function(' $1
}

for FILE in ./src/**/browser/**/*.+(js|ts); do
	process $FILE
done
