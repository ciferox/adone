const { is, util, net: { mail: { __ } } } = adone;

/**
 * Generates a Transport object for Sendmail
 */
export default class JSONTransport {
    constructor(options = {}) {
        this.options = options;

        this.name = "StreamTransport";
        this.version = "x.x.x";  // TODO: adone version?

        this.logger = __.shared.getLogger(this.options, {
            component: this.options.component || "stream-transport"
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
            mail.resolveAll((err, data) => {
                if (err) {
                    this.logger.error({
                        err,
                        tnx: "send",
                        messageId
                    }, "Failed building JSON structure for %s. %s", messageId, err.message);
                    return done(err);
                }

                data.messageId = messageId;

                for (const key of ["html", "text", "watchHtml"]) {
                    if (data[key] && data[key].content) {
                        if (is.string(data[key].content)) {
                            data[key] = data[key].content;
                        } else if (is.buffer(data[key].content)) {
                            data[key] = data[key].content.toString();
                        }
                    }
                }

                if (data.icalEvent && is.buffer(data.icalEvent.content)) {
                    data.icalEvent.content = data.icalEvent.content.toString("base64");
                    data.icalEvent.encoding = "base64";
                }

                if (data.alternatives && data.alternatives.length) {
                    for (const alternative of data.alternatives) {
                        if (alternative && alternative.content && is.buffer(alternative.content)) {
                            alternative.content = alternative.content.toString("base64");
                            alternative.encoding = "base64";
                        }
                    }
                }

                if (data.attachments && data.attachments.length) {
                    for (const attachment of data.attachments) {
                        if (attachment && attachment.content && is.buffer(attachment.content)) {
                            attachment.content = attachment.content.toString("base64");
                            attachment.encoding = "base64";
                        }
                    }
                }

                return done(null, {
                    envelope: mail.data.envelope || mail.message.getEnvelope(),
                    messageId,
                    message: JSON.stringify(data)
                });
            });
        });
    }
}
