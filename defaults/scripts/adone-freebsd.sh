#!/bin/sh

# PROVIDE: adone
# REQUIRE: LOGIN
# KEYWORD: shutdown

. /etc/rc.subr

name=adone
rcvar=${name}_enable

load_rc_config $name

: ${adone_user="%USER%"}

command="%ADONE_PATH%"
pidfile="/home/${adone_user}/.adone/${name}.pid"
start_cmd="${name}_start"
stop_cmd="${name}_stop"
reload_cmd="${name}_reload"
status_cmd="${name}_status"

extra_commands="reload"

super() {
        su - "${adone_user}" -c "$*"
}

adone_start() {
        unset "${rc_flags}_cmd"
        if adone_running; then
                echo "Adone is already running, 'adone list' to see running processes"
        else
                echo "Starting adone."
                super $command resurrect
        fi
}

adone_stop() {
        echo "Stopping ${name}..."
        #super $command dump
        super $command delete all
        super $command kill
}

adone_reload() {
        echo "Reloading ${name}"
        super $command reload all
}

adone_status() {
        super $command list
}

adone_running() {
        process_id=$(pgrep -F ${pidfile})
        if [ "${process_id}" -gt 0 ]; then
                return 0
        else
                return 1
        fi
}

run_rc_command "$1"
