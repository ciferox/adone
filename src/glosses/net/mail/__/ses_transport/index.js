const {
    is,
    net: { mail: { __ } },
    event: { EventEmitter }
} = adone;

/**
 * Generates a Transport object for Sendmail
 *
 * Possible options can be the following:
 *
 *  * **path** optional path to sendmail binary
 *  * **args** an array of arguments for the sendmail binary
 *
 * @constructor
 * @param {Object} optional config parameter for the AWS Sendmail service
 */
export default class SESTransport extends EventEmitter {
    constructor(options) {
        super();
        options = options || {};

        this.options = options || {};
        this.ses = this.options.SES;

        this.name = "SESTransport";
        this.version = "x.x.x";  // TODO: adone version ?

        this.logger = __.shared.getLogger(this.options, {
            component: this.options.component || "ses-transport"
        });

        // parallel sending connections
        this.maxConnections = Number(this.options.maxConnections) || Infinity;
        this.connections = 0;

        // max messages per second
        this.sendingRate = Number(this.options.sendingRate) || Infinity;
        this.sendingRateTTL = null;
        this.rateInterval = 1000;
        this.rateMessages = [];

        this.pending = [];

        this.idling = true;

        setImmediate(() => {
            if (this.idling) {
                this.emit("idle");
            }
        });
    }

    /**
     * Schedules a sending of a message
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(mail, callback) {
        if (this.connections >= this.maxConnections) {
            this.idling = false;
            return this.pending.push({
                mail,
                callback
            });
        }

        if (!this._checkSendingRate()) {
            this.idling = false;
            return this.pending.push({
                mail,
                callback
            });
        }

        this._send(mail, (...args) => {
            setImmediate(() => callback(...args));
            this._sent();
        });
    }

    _checkRatedQueue() {
        if (this.connections >= this.maxConnections || !this._checkSendingRate()) {
            return;
        }

        if (!this.pending.length) {
            if (!this.idling) {
                this.idling = true;
                this.emit("idle");
            }
            return;
        }

        const next = this.pending.shift();
        this._send(next.mail, (...args) => {
            setImmediate(() => next.callback(...args));
            this._sent();
        });
    }

    _checkSendingRate() {
        clearTimeout(this.sendingRateTTL);

        const now = Date.now();
        let oldest = false;
        // delete older messages
        for (let i = this.rateMessages.length - 1; i >= 0; i--) {

            if (this.rateMessages[i].ts >= now - this.rateInterval && (!oldest || this.rateMessages[i].ts < oldest)) {
                oldest = this.rateMessages[i].ts;
            }

            if (this.rateMessages[i].ts < now - this.rateInterval && !this.rateMessages[i].pending) {
                this.rateMessages.splice(i, 1);
            }
        }

        if (this.rateMessages.length < this.sendingRate) {
            return true;
        }

        const delay = Math.max(oldest + 1001, now + 20);
        this.sendingRateTTL = setTimeout(() => this._checkRatedQueue(), now - delay);
        this.sendingRateTTL.unref();
        return false;
    }

    _sent() {
        this.connections--;
        this._checkRatedQueue();
    }

    /**
     * Returns true if there are free slots in the queue
     */
    isIdle() {
        return this.idling;
    }

    /**
     * Compiles a mailcomposer message and forwards it to SES
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    _send(mail, callback) {
        const statObject = {
            ts: Date.now(),
            pending: true
        };
        this.connections++;
        this.rateMessages.push(statObject);

        const envelope = mail.data.envelope || mail.message.getEnvelope();
        const messageId = mail.message.messageId();

        const recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
            recipients.push(`...and ${recipients.splice(2).length} more`);
        }
        this.logger.info({
            tnx: "send",
            messageId
        }, "Sending message %s to <%s>", messageId, recipients.join(", "));

        const getRawMessage = (next) => {

            // do not use Message-ID and Date in DKIM signature
            if (!mail.data._dkim) {
                mail.data._dkim = {};
            }
            if (mail.data._dkim.skipFields && is.string(mail.data._dkim.skipFields)) {
                mail.data._dkim.skipFields += ":date:message-id";
            } else {
                mail.data._dkim.skipFields = "date:message-id";
            }

            const sourceStream = mail.message.createReadStream();
            const stream = sourceStream.pipe(new __.LeWindows());
            const chunks = [];
            let chunklen = 0;

            stream.on("readable", () => {
                for ( ; ; ) {
                    const chunk = stream.read();
                    if (is.null(chunk)) {
                        break;
                    }
                    chunks.push(chunk);
                    chunklen += chunk.length;
                }
            });

            sourceStream.once("error", (err) => stream.emit("error", err));

            stream.once("error", (err) => {
                next(err);
            });

            stream.once("end", () => next(null, Buffer.concat(chunks, chunklen)));
        };

        setImmediate(() => getRawMessage((err, raw) => {
            if (err) {
                this.logger.error({
                    err,
                    tnx: "send",
                    messageId
                }, "Failed creating message for %s. %s", messageId, err.message);
                statObject.pending = false;
                return callback(err);
            }

            const sesMessage = {
                RawMessage: { // required
                    Data: raw // required
                },
                Source: envelope.from,
                Destinations: envelope.to
            };

            Object.keys(mail.data.ses || {}).forEach((key) => {
                sesMessage[key] = mail.data.ses[key];
            });

            this.ses.sendRawEmail(sesMessage, (err, data) => {
                if (err) {
                    this.logger.error({
                        err,
                        tnx: "send"
                    }, "Send error for %s: %s", messageId, err.message);
                    statObject.pending = false;
                    return callback(err);
                }

                let region = this.ses.config && this.ses.config.region || "us-east-1";
                if (region === "us-east-1") {
                    region = "email";
                }

                statObject.pending = false;
                callback(null, {
                    envelope: {
                        from: envelope.from,
                        to: envelope.to
                    },
                    messageId: `<${data.MessageId}${!/@/.test(data.MessageId) ? `@${region}.amazonses.com` : ""}>`,
                    response: data.MessageId
                });
            });
        }));
    }

    /**
     * Verifies SES configuration
     *
     * @param {Function} callback Callback function
     */
    verify(callback) {
        let promise;

        if (!callback) {
            promise = new Promise((resolve, reject) => {
                callback = __.shared.callbackPromise(resolve, reject);
            });
        }

        this.ses.sendRawEmail({
            RawMessage: { // required
                Data: "From: invalid@invalid\r\nTo: invalid@invalid\r\n Subject: Invalid\r\n\r\nInvalid"
            },
            Source: "invalid@invalid",
            Destinations: ["invalid@invalid"]
        }, (err) => {
            if (err && err.code !== "InvalidParameterValue") {
                return callback(err);
            }
            return callback(null, true);
        });

        return promise;
    }
}
