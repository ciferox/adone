

const imports = adone.lazify({
    Command: "../command",
    utils: "../utils"
}, null, require);

export function connectHandler(self) {
    return () => {
        self.setStatus("connect");

        self.resetCommandQueue();

        // AUTH command should be processed before any other commands
        let flushed = false;
        if (self.condition.auth) {
            self.auth(self.condition.auth, (err) => {
                if (err) {
                    if (err.message.indexOf("no password is set") === -1) {
                        flushed = true;
                        self.flushQueue(err);
                        self.silentEmit("error", err);
                        self.disconnect(true);
                    } else {
                        adone.warn("Redis server does not require a password, but a password was supplied.");
                    }
                }
            });
        }

        if (self.condition.select) {
            self.select(self.condition.select);
        }

        if (!self.options.enableReadyCheck) {
            readyHandler(self)();
        }

        self.initParser();

        if (self.options.enableReadyCheck) {
            self._readyCheck((err, info) => {
                if (err) {
                    if (!flushed) {
                        self.flushQueue(new adone.x.Exception(`Ready check failed: ${err.message}`));
                        self.silentEmit("error", err);
                        self.disconnect(true);
                    }
                } else {
                    self.serverInfo = info;
                    if (self.connector.check(info)) {
                        readyHandler(self)();
                    } else {
                        self.disconnect(true);
                    }
                }
            });
        }
    };
}

export function closeHandler(self) {
    return () => {
        self.setStatus("close");

        if (!self.prevCondition) {
            self.prevCondition = self.condition;
        }
        if (self.commandQueue.length) {
            self.prevCommandQueue = self.commandQueue;
        }

        if (self.manuallyClosing) {
            self.manuallyClosing = false;
            return close();
        }

        if (!adone.is.function(self.options.retryStrategy)) {
            return close();
        }
        const retryDelay = self.options.retryStrategy(++self.retryAttempts);

        if (!adone.is.number(retryDelay)) {
            return close();
        }


        self.setStatus("reconnecting", retryDelay);
        self.reconnectTimeout = setTimeout(function () {
            self.reconnectTimeout = null;
            self.connect().catch(adone.noop);
        }, retryDelay);
    };

    function close() {
        self.setStatus("end");
        self.flushQueue(new adone.x.Exception(imports.utils.CONNECTION_CLOSED_ERROR_MSG));
    }
}

export function dataHandler(self) {
    return (data) => {
        self.replyParser.execute(data);
    };
}

export function errorHandler(self) {
    return (error) => {
        self.silentEmit("error", error);
    };
}

export function readyHandler(self) {
    return () => {
        self.setStatus("ready");
        self.retryAttempts = 0;

        if (self.options.monitor) {
            self.call("monitor");
            const sendCommand = self.sendCommand;
            self.sendCommand = function (command) {
                if (imports.Command.checkFlag("VALID_IN_MONITOR_MODE", command.name)) {
                    return sendCommand.call(self, command);
                }
                command.reject(new adone.x.Exception("Connection is in monitoring mode, can't process commands."));
                return command.promise;
            };
            self.once("close", function () {
                delete self.sendCommand;
            });
            self.setStatus("monitoring");
            return;
        }
        let item;
        const finalSelect = self.prevCondition ? self.prevCondition.select : self.condition.select;

        if (self.options.connectionName) {
            self.client("setname", self.options.connectionName);
        }

        if (self.options.readOnly) {
            self.readonly().catch(adone.noop);
        }

        if (self.prevCondition) {
            const condition = self.prevCondition;
            self.prevCondition = null;
            if (condition.subscriber && self.options.autoResubscribe) {
                // We re-select the previous db first since
                // `SELECT` command is not valid in sub mode.
                if (self.condition.select !== finalSelect) {
                    self.select(finalSelect);
                }
                const subscribeChannels = condition.subscriber.channels("subscribe");
                if (subscribeChannels.length) {
                    self.subscribe(subscribeChannels);
                }
                const psubscribeChannels = condition.subscriber.channels("psubscribe");
                if (psubscribeChannels.length) {
                    self.psubscribe(psubscribeChannels);
                }
            }
        }

        if (self.prevCommandQueue) {
            if (self.options.autoResendUnfulfilledCommands) {
                while (self.prevCommandQueue.length > 0) {
                    item = self.prevCommandQueue.shift();
                    if (item.select !== self.condition.select && item.command.name !== "select") {
                        self.select(item.select);
                    }
                    self.sendCommand(item.command, item.stream);
                }
            } else {
                self.prevCommandQueue = null;
            }
        }

        if (self.offlineQueue.length) {
            const offlineQueue = self.offlineQueue;
            self.resetOfflineQueue();
            while (offlineQueue.length > 0) {
                item = offlineQueue.shift();
                if (item.select !== self.condition.select && item.command.name !== "select") {
                    self.select(item.select);
                }
                self.sendCommand(item.command, item.stream);
            }
        }

        if (self.condition.select !== finalSelect) {
            self.select(finalSelect);
        }
    };
}
