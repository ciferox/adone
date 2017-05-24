const {
    is, util,
    net: { mail: { __ } }
} = adone;

/**
 * Generates a Transport object for streaming
 *
 * Possible options can be the following:
 *
 *  * **buffer** if true, then returns the message as a Buffer object instead of a stream
 *  * **newline** either 'windows' or 'unix'
 *
 * @constructor
 * @param {Object} optional config parameter for the AWS Sendmail service
 */
export default class SendmailTransport {
    constructor(options) {
        options = options || {};

        this.options = options || {};

        this.name = "StreamTransport";
        // this.version = packageData.version;
        this.version = "x.x.x";

        this.logger = __.shared.getLogger(this.options, {
            component: this.options.component || "stream-transport"
        });

        this.winbreak = ["win", "windows", "dos", "\r\n"].includes((options.newline || "").toString().toLowerCase());
    }

    /**
     * Compiles a mailcomposer message and forwards it to handler that sends it
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(mail, done) {
        // We probably need this in the output
        mail.message.keepBcc = true;

        const envelope = mail.data.envelope || mail.message.getEnvelope();
        const messageId = mail.message.messageId();

        const recipients = util.arrify(envelope.to || []);
        if (recipients.length > 3) {
            recipients.push(`...and ${recipients.splice(2).length} more`);
        }
        this.logger.info({
            tnx: "send",
            messageId
        }, "Sending message %s to <%s> using %s line breaks", messageId, recipients.join(", "), this.winbreak ? "<CR><LF>" : "<LF>");

        setImmediate(() => {

            let sourceStream;
            let stream;
            let transform;

            try {
                transform = this.winbreak ? new __.LeWindows() : new __.LeUnix();
                sourceStream = mail.message.createReadStream();
                stream = sourceStream.pipe(transform);
                sourceStream.on("error", (err) => stream.emit("error", err));
            } catch (E) {
                this.logger.error({
                    err: E,
                    tnx: "send",
                    messageId
                }, "Creating send stream failed for %s. %s", messageId, E.message);
                return done(E);
            }

            if (!this.options.buffer) {
                stream.once("error", (err) => {
                    this.logger.error({
                        err,
                        tnx: "send",
                        messageId
                    }, "Failed creating message for %s. %s", messageId, err.message);
                });
                return done(null, {
                    envelope: mail.data.envelope || mail.message.getEnvelope(),
                    messageId,
                    message: stream
                });
            }

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

            stream.once("error", (err) => {
                this.logger.error({
                    err,
                    tnx: "send",
                    messageId
                }, "Failed creating message for %s. %s", messageId, err.message);
                return done(err);
            });

            stream.on("end", () => done(null, {
                envelope: mail.data.envelope || mail.message.getEnvelope(),
                messageId,
                message: Buffer.concat(chunks, chunklen)
            }));
        });
    }
}
