#!/bin/bash

# Environment variables for showing system notifications

# ------------------
# For run.sh
# ------------------
# First... annoyances. Many system administrators bump into
# these variables, to get kdialog function from a cron job.
# Unfortunately, not described well in documentation.
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
export DISPLAY=:0                   # DISPLAY=:0 or DISPLAY=:0.0
export QT_DEBUG_PLUGINS=0           # For debug KDE notifications
export QT_QPA_PLATFORM=xcb          # Force platform plugin xcb
export XAUTHORITY=~/.Xauthority
export XDG_SESSION_DESKTOP=KDE
export XDG_SESSION_TYPE=x11
export XDG_CURRENT_DESKTOP=KDE
export XDG_RUNTIME_DIR=/run/user/1000

# ------------------
# For index.mjs
# ------------------
export NOTIFICATIONS_DEBUG=0
export NOTIFICATIONS_DIR=`/opt/project` # Put absolute path to project here
export NOTIFICATIONS_METHOD="kde-dialog" # kde-dialog, kde-popup, notify-send or zenity
export NOTIFICATIONS_TIMEOUT=60000 # In ms
export NOTIFICATIONS_TMP=/tmp/notifications # Temp file
