#!/bin/bash

cd `dirname $0`
cd ../..

tools/init-kate.sh
gvim
terminator --config tools/terminal/terminator.cfg > /dev/null 2>&1 &
