#!/bin/bash

#
# Script to generate diagrams from text, in project directory.
# Scans for all diagrams not existing yet, or updated.
#
# Requires: npm i -g pintora
#

DIR_PROJECT=`pwd`
if [ ! -d ./diagrams ]; then
	echo "Creating diagrams directory"
	mkdir diagrams
fi

cd `dirname $0`
cd ..
DIR_CHI=`pwd` # cookware-headless-ice directory


function generate {
	if [ $1 == "mermaid" ]; then
		CMD="$DIR_CHI/node_modules/.bin/mmdc"
		CMD_SEC=""
		EXT_IN="*.mmd"
		EXT_OUT="png" # ".md", ".svg", ".png" or ".pdf"
	elif [ $1 == "pintora" ]; then
		CMD="pintora"
		CMD_SEC="render"
		EXT_IN="*.pintora"
		EXT_OUT="jpg" # ".svg", ".png" or ".jpg"
	else
		echo "Unknown: $1"
		exit 1
	fi

	cd $DIR_PROJECT/diagrams
	find . -type f -iname $EXT_IN | while read -r ENTRY; do
		DIR=`dirname $ENTRY`
		FILE=`basename $ENTRY`
		STEM=`echo $FILE | cut -d'.' -f1`
		OUT=$DIR/$STEM.$EXT_OUT
		WRITE=0
		if [ ! -f $OUT ]; then
			echo "New:      $DIR/$FILE"
			WRITE=1
		elif [ $ENTRY -nt $OUT ]; then
			echo "Updated:  $DIR/$FILE"
			WRITE=1
		fi

		if [ $WRITE -eq 1 ]; then
			$CMD $CMD_SEC -i $ENTRY -o $OUT &> /dev/null
			if [ ${?} -ne 0 ]; then
				echo "Error in: $DIR/$FILE"
			fi
		fi
	done
}

generate "mermaid"
generate "pintora"
