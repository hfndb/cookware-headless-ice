#!/bin/bash

cd `dirname $0`
cd ..

FILE=$1
DIFF=$2

DAYS=1	# Change this setting according to your wishes
DATE_FORMAT="%Y%m%d-%H%M"
STAMP=`date +"$DATE_FORMAT"`
PROJECT_DIR=`pwd`

# In case initiated from terminal
if [ "$FILE" = "" ]
then
	FILE="backups/$STAMP-changes.tgz"
fi

if [ "$DIFF" = "" ]
then
	DIFF="notes/$STAMP-git.diff"
fi

git diff > $DIFF
find . -mtime -$DAYS -type f ! -path "./.git/*" ! -path "./backups/*" | tar -czf $PROJECT_DIR/$FILE -T -
rm $DIFF

echo "Wrote changes of last $DAYS days to file $FILE"

# Remove backups older than $DAYS
find ./backups -mtime +$DAYS -type f -delete

# echo "Content of archive:"
# tar -ztvf $FILE

# echo "To unpack use 'tar -xzf --keep-newer-files --overwrite <file>"
