#!/bin/bash

DIR_PROJECT=`pwd`
DIR_DOMAIN=`basename $DIR_PROJECT`
DIR_DRUPAL_REPO=/data/drupal
DIR_STUDY=/data/study/drupal
DIR_INSTALL=$DIR_DRUPAL_REPO/$DIR_DOMAIN
DRUPAL_VERSION=9.2.0
SERVER_PID=0

# Set some modules to retrieve
declare -A MODULES # Associative arrays: bash version >= 4

# For example...
MODULES["switch_page_theme"]=https://ftp.drupal.org/files/projects/switch_page_theme-8.x-1.0.tar.gz

# Color definitions
COLOR_LIGHT_GREEN="\033[1;32m"
COLOR_YELLOW="\033[1;33m"
COLOR_LIGHT_BLUE="\033[1;34m"
COLOR_NC="\033[0m" # No Color
