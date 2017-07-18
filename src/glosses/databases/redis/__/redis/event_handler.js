const { database: { redis: { __ } }, x, is, noop } = adone;

export const readyHandler = (self) => {
    return () => {
        self.setStatus("ready");
        self.retryAttempts = 0;

        if (self.options.monitor) {
            self.call("monitor");
            const { sendCommand } = self;
            self.sendCommand = (command) => {
                if (__.Command.checkFlag("VALID_IN_MONITOR_MODE", command.name)) {
                    return sendCommand.call(self, command);
                }
                command.reject(new x.Exception("Connection is in monitoring mode, can't process commands."));
                return command.promise;
            };
            self.once("close", () => {
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
            self.readonly().catch(noop);
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
};

export const connectHandler = (self) => {
    return () => {
        self.setStatus("connect");

        self.resetCommandQueue();

        // AUTH command should be processed before any other commands
        let flushed = false;
        if (self.condition.auth) {
            self.auth(self.condition.auth).catch((err) => {
                if (!err.message.includes("no password is set")) {
                    flushed = true;
                    self.flushQueue(err);
                    self.silentEmit("error", err);
                    self.disconnect(true);
                } else {
                    adone.warn("Redis server does not require a password, but a password was supplied.");
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
            self._readyCheck().then((info) => {
                self.serverInfo = info;
                if (self.connector.check(info)) {
                    readyHandler(self)();
                } else {
                    self.disconnect(true);
                }
            }, (err) => {
                if (!flushed) {
                    self.flushQueue(new x.Exception(`Ready check failed: ${err.message}`));
                    self.silentEmit("error", err);
                    self.disconnect(true);
                }
            });
        }
    };
};

export const closeHandler = (self) => {
    const close = () => {
        self.setStatus("end");
        self.flushQueue(new x.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG));
    };

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

        if (!is.function(self.options.retryStrategy)) {
            return close();
        }
        const retryDelay = self.options.retryStrategy(++self.retryAttempts);

        if (!is.number(retryDelay)) {
            return close();
        }


        self.setStatus("reconnecting", retryDelay);
        self.reconnectTimeout = setTimeout(() => {
            self.reconnectTimeout = null;
            self.connect().catch(noop);
        }, retryDelay);
    };
};

export const dataHandler = (self) => {
    return (data) => {
        self.replyParser.execute(data);
    };
};

export const errorHandler = (self) => {
    return (error) => {
        self.silentEmit("error", error);
    };
};
