const { is, lazify } = adone;

export const __ = lazify({
    addressparser: "./__/addressparser",
    dkim: "./__/dkim",
    Cookies: "./__/fetch/cookies",
    fetch: "./__/fetch",
    MailComposer: "./__/mail_composer",
    MimeNode: "./__/mime_node",
    mimeFuncs: "./__/mime_funcs",
    mimeTypes: "./__/mime_funcs/mime_types",
    qp: "./__/qp",
    LeUnix: "./__/sendmail_transport/le_unix",
    LeWindows: "./__/sendmail_transport/le_windows",
    SendmailTransport: "./__/sendmail_transport",
    shared: "./__/shared",
    SMTPConnection: "./__/smtp_connection",
    XOAuth2: "./__/xoauth2",
    SMTPPool: "./__/smtp_pool",
    SMTPTransport: "./__/smtp_transport",
    StreamTransport: "./__/stream_transport",
    wellKnown: "./__/well_known",
    DataStream: "./__/smtp_connection/data_stream",
    PoolResource: "./__/smtp_pool/pool_resource",
    JSONTransport: "./__/json_transport",
    Mailer: "./__/mailer",
    MailMessage: "./__/mailer/mail_message",
    SESTransport: "./__/ses_transport"
}, null, require);

export const createTransport = (transporter, defaults) => {
    let options;

    if (
        // provided transporter is a configuration object, not transporter plugin
        (is.object(transporter) && !is.function(transporter.send)) ||
        // provided transporter looks like a connection url
        (is.string(transporter) && /^(smtps?|direct):/i.test(transporter))
    ) {
        const urlConfig = is.string(transporter) ? transporter : transporter.url;
        if (urlConfig) {
            options = __.shared.parseConnectionUrl(urlConfig);
        } else {
            options = transporter;
        }

        if (options.pool) {
            transporter = new __.SMTPPool(options);
        } else if (options.sendmail) {
            transporter = new __.SendmailTransport(options);
        } else if (options.streamTransport) {
            transporter = new __.StreamTransport(options);
        } else if (options.jsonTransport) {
            transporter = new __.JSONTransport(options);
        } else if (options.SES) {
            transporter = new __.SESTransport(options);
        } else {
            transporter = new __.SMTPTransport(options);
        }
    }

    return new __.Mailer(transporter, options, defaults);
};
