#!/bin/sh

set -e
cd "$1/liblzma"

MAKE=make
uname="$(uname)"
if [ "$uname" == 'FreeBSD' ]; then
    MAKE=gmake
fi
$MAKE
$MAKE install
