const { is, util, net: { mail: { __ } } } = adone;

/**
 * Generates a Transport object for Sendmail
 */
export default class JSONTransport {
    constructor(options = {}) {
        this.options = options;

        this.name = "JSONTransport";
        this.version = "x.x.x";  // TODO: adone version?

        this.logger = __.shared.getLogger(this.options, {
            component: this.options.component || "json-transport"
        });
    }

    /**
     * Compiles a mailcomposer message and forwards it to handler that sends it.
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(mail, done) {
        // Sendmail strips this header line by itself
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
        }, "Composing JSON structure of %s to <%s>", messageId, recipients.join(", "));

        setImmediate(() => {
            mail.normalize((err, data) => {
                if (err) {
                    this.logger.error({
                        err,
                        tnx: "send",
                        messageId
                    }, "Failed building JSON structure for %s. %s", messageId, err.message);
                    return done(err);
                }

                delete data.envelope;
                delete data.normalizedHeaders;

                return done(null, {
                    envelope,
                    messageId,
                    message: JSON.stringify(data)
                });
            });
        });
    }
}
