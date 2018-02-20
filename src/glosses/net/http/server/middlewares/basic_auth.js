const {
    is,
    error,
    net: { http: { server: { helper } } }
} = adone;

export default function basicAuth(verify, options = {}) {
    if (!is.function(verify)) {
        if (!is.object(verify)) {
            throw new error.InvalidArgument("verify function or creds are required");
        }
        [verify, options] = [null, verify];
    }

    if (is.null(verify)) {
        const { name = null, pass = null } = options;
        if (is.null(name) || is.null(pass)) {
            throw new error.InvalidArgument("name and pass are required");
        }
        verify = (creds) => creds.name === name && creds.pass === pass;
    }

    const { sendAuthenticate = true, realm = null, message = "Unauthorized" } = options;

    let headerValue = "Basic";
    if (!is.null(realm)) {
        headerValue += ` realm="${realm}"`;
    }

    return (ctx, next) => {
        const creds = helper.basicAuth.from(ctx);
        if (!is.null(creds) && verify(creds)) {
            return next();
        }
        if (sendAuthenticate) {
            ctx.set("WWW-Authenticate", headerValue);
            ctx.status = 401;
            ctx.message = message;
        } else {
            ctx.throw(401, message);
        }
    };
}
