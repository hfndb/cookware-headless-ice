@ECHO OFF


SET NODE_ENV=development
:: or production

:: Get directory of this batch file
SET binDir=%~dp0

start node --preserve-symlinks %binDir%/../dist/static/js/index.js $1 $2 $3 $4
