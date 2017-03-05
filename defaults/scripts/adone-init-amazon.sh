#!/bin/bash
#
# adone Process manager for NodeJS
#
# chkconfig: 345 80 20
#
# description: ADONE next gen process manager for Node.js
# processname: adone
#
### BEGIN INIT INFO
# Provides:          adone
# Required-Start: $local_fs $remote_fs
# Required-Stop: $local_fs $remote_fs
# Should-Start: $network
# Should-Stop: $network
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
# Short-Description: ADONE init script
# Description: ADONE is the next gen process manager for Node.js
### END INIT INFO

NAME=adone
ADONE=%ADONE_PATH%
USER=%USER%

export PATH=%NODE_PATH%:$PATH
export ADONE_HOME="%HOME_PATH%"

lockfile="/var/lock/subsys/adone-init.sh"

super() {
    su - $USER -c "PATH=$PATH; ADONE_HOME=$ADONE_HOME $*"
}

start() {
    echo "Starting $NAME"
    super $ADONE resurrect
    retval=$?
    [ $retval -eq 0 ] && touch $lockfile
}

stop() {
    echo "Stopping $NAME"
    #super $ADONE dump
    super $ADONE delete all
    super $ADONE kill
    rm -f $lockfile
}

restart() {
    echo "Restarting $NAME"
    stop
    start
}

reload() {
    echo "Reloading $NAME"
    super $ADONE reload all
}

status() {
    echo "Status for $NAME:"
    super $ADONE list
    RETVAL=$?
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        restart
        ;;
    reload)
        reload
        ;;
    *)
        echo "Usage: {start|stop|status|restart|reload}"
        exit 1
        ;;
esac
exit $RETVAL
