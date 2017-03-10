

const imports = adone.lazify({
    Command: "../command",
    SubscriptionSet: "../subscription_set",
    createParser: "./libparser",
    ReplyError: "../reply_error"
}, null, require);

/**
 * Init the parser
 *
 * @method _initParser
 * @memberOf Redis#
 * @private
 */
export function initParser() {
    this.replyParser = imports.createParser({
        name: this.options.parser,
        stringNumbers: this.options.stringNumbers,
        returnBuffers: !this.options.dropBufferSupport,
        returnError: (err) => {
            this.returnError(new imports.ReplyError(err.message));
        },
        returnReply: (reply) => {
            this.returnReply(reply);
        },
        returnFatalError: (err) => {
            this.flushQueue(err, { offlineQueue: false });
            this.silentEmit("error", new adone.x.Exception(`Redis parser fatal error: ${err.stack}`));
            this.disconnect(true);
        }
    });
}

export function returnError(err) {
    const item = this.commandQueue.shift();

    err.command = {
        name: item.command.name,
        args: item.command.args
    };

    let needReconnect = false;
    if (this.options.reconnectOnError) {
        needReconnect = this.options.reconnectOnError(err);
    }

    switch (needReconnect) {
        case 1:
        case true:
            if (this.status !== "reconnecting") {
                this.disconnect(true);
            }
            item.command.reject(err);
            break;
        case 2:
            if (this.status !== "reconnecting") {
                this.disconnect(true);
            }
            if (this.condition.select !== item.select && item.command.name !== "select") {
                this.select(item.select);
            }
            this.sendCommand(item.command);
            break;
        default:
            item.command.reject(err);
    }
}

export function returnReply(reply) {
    if (this.status === "monitoring") {
        // Valid commands in the monitoring mode are AUTH and MONITOR,
        // both of which always reply with 'OK'.
        const replyStr = reply.toString();

        // If not the reply to AUTH & MONITOR
        if (replyStr !== "OK") {
            // Since commands sent in the monitoring mode will trigger an exception,
            // any replies we received in the monitoring mode should consider to be
            // realtime monitor data instead of result of commands.
            const len = replyStr.indexOf(" ");
            const timestamp = replyStr.slice(0, len);
            const argindex = replyStr.indexOf("\"");
            const args = replyStr.slice(argindex + 1, -1).split("\" \"").map((elem) => {
                return elem.replace(/\\"/g, "\"");
            });
            const dbAndSource = replyStr.slice(len + 2, argindex - 2).split(" ");
            this.emit("monitor", timestamp, args, dbAndSource[1], dbAndSource[0]);
            return;
        }
    }

    let item;
    let channel;
    let count;
    if (this.condition.subscriber) {
        const replyType = adone.is.array(reply) ? reply[0].toString() : null;
        switch (replyType) {
            case "message":
                if (this.listeners("message").length > 0) {
                    this.emit("message", reply[1].toString(), reply[2].toString());
                }
                if (this.listeners("messageBuffer").length > 0) {
                    this.emit("messageBuffer", reply[1], reply[2]);
                }
                break;
            case "pmessage": {
                const pattern = reply[1].toString();
                if (this.listeners("pmessage").length > 0) {
                    this.emit("pmessage", pattern, reply[2].toString(), reply[3].toString());
                }
                if (this.listeners("pmessageBuffer").length > 0) {
                    this.emit("pmessageBuffer", pattern, reply[2], reply[3]);
                }
                break;
            }
            case "subscribe":
            case "psubscribe":
                channel = reply[1].toString();
                this.condition.subscriber.add(replyType, channel);
                item = this.commandQueue.shift();
                if (!fillSubCommand(item.command, reply[2])) {
                    this.commandQueue.unshift(item);
                }
                break;
            case "unsubscribe":
            case "punsubscribe":
                channel = reply[1] ? reply[1].toString() : null;
                if (channel) {
                    this.condition.subscriber.del(replyType, channel);
                }
                count = reply[2];
                if (count === 0) {
                    this.condition.subscriber = false;
                }
                item = this.commandQueue.shift();
                if (!fillUnsubCommand(item.command, count)) {
                    this.commandQueue.unshift(item);
                }
                break;
            default:
                item = this.commandQueue.shift();
                item.command.resolve(reply);
        }
    } else {
        item = this.commandQueue.shift();
        if (!item) {
            const err = new adone.x.Exception("Command queue state error. Last reply: " + reply.toString());
            return this.emit("error", err);
        }
        if (imports.Command.checkFlag("ENTER_SUBSCRIBER_MODE", item.command.name)) {
            this.condition.subscriber = new imports.SubscriptionSet();
            this.condition.subscriber.add(item.command.name, reply[1].toString());

            if (!fillSubCommand(item.command, reply[2])) {
                this.commandQueue.unshift(item);
            }
        } else if (imports.Command.checkFlag("EXIT_SUBSCRIBER_MODE", item.command.name)) {
            if (!fillUnsubCommand(item.command, reply[2])) {
                this.commandQueue.unshift(item);
            }
        } else {
            item.command.resolve(reply);
        }
    }

    function fillSubCommand(command, count) {
        if (typeof command.remainReplies === "undefined") {
            command.remainReplies = command.args.length;
        }
        if (--command.remainReplies === 0) {
            command.resolve(count);
            return true;
        }
        return false;
    }

    function fillUnsubCommand(command, count) {
        if (typeof command.remainReplies === "undefined") {
            command.remainReplies = command.args.length;
        }
        if (command.remainReplies === 0) {
            if (count === 0) {
                command.resolve(reply[2]);
                return true;
            }
            return false;
        }
        if (--command.remainReplies === 0) {
            command.resolve(reply[2]);
            return true;
        }
        return false;
    }
}
