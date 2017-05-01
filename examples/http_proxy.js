import * as forge from "node-forge";

const getKeysAndCert = () => {
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = adone.std.crypto.randomBytes(16).toString("hex");
    cert.validity.notBefore = new Date();
    cert.validity.notBefore.setFullYear(cert.validity.notBefore.getFullYear() - 10); // 10 years
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10); // 10 years
    return { keys, cert };
};

const generateRootCA = () => {
    const keysAndCert = getKeysAndCert();
    const keys = keysAndCert.keys;
    const cert = keysAndCert.cert;

    const attrs = [
        { name: "countryName", value: "UU" },
        { name: "organizationName", value: "proxy" },
        { shortName: "ST", value: "UU" },
        { shortName: "OU", value: "ssl Proxy" },
        { name: "commonName", value: "RootCA" },
        { name: "countryName", value: "US" },
        { shortName: "ST", value: "Verginia" },
        { shortName: "OU", value: "Beauty" },
        { name: "localityName", value: "Blacksburg" },
        { name: "organizationName", value: "value" }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
        { name: "basicConstraints", cA: true }
    ]);

    cert.sign(keys.privateKey, forge.md.sha256.create());

    return {
        privateKey: forge.pki.privateKeyToPem(keys.privateKey),
        publicKey: forge.pki.publicKeyToPem(keys.publicKey),
        certificate: forge.pki.certificateToPem(cert)
    };
};

const generateCertForHostname = (domain, rootCAConfig) => {
    adone.info(`generate certificate for ${domain}`);
    const keysAndCert = getKeysAndCert();
    const keys = keysAndCert.keys;
    const cert = keysAndCert.cert;

    const caCert = forge.pki.certificateFromPem(rootCAConfig.cert);
    const caKey = forge.pki.privateKeyFromPem(rootCAConfig.key);

    // issuer from CA
    cert.setIssuer(caCert.subject.attributes);

    const attrs = [
        { name: "countryName", value: "UU" },
        { name: "organizationName", value: "proxy" },
        { shortName: "ST", value: "UU" },
        { shortName: "OU", value: "ssl Proxy" },
        { name: "commonName", value: domain },
        { name: "countryName", value: "US" },
        { shortName: "ST", value: "Verginia" },
        { shortName: "OU", value: "Beauty" },
        { name: "localityName", value: "Blacksburg" },
        { name: "organizationName", value: "value" }
    ];
    cert.setSubject(attrs);
    cert.sign(caKey, forge.md.sha256.create());

    return {
        key: forge.pki.privateKeyToPem(keys.privateKey),
        // publicKey: forge.pki.publicKeyToPem(keys.publicKey),
        cert: forge.pki.certificateToPem(cert)
    };
};

const httpsHandler = () => {
    // const rootCA = generateRootCA();
    const rootCA = {
        key: "-----BEGIN RSA PRIVATE KEY-----\r\nMIICXAIBAAKBgQDI5wR6cb6P6Dm0TMaOdv3Md8X5IjDETAVQA/NTKWjBv2uOeBKS\r\nADVbqotBXkHhvlio5ceayJLzPsul6zN218fkUTOZL1XCkJR3m9MdpL/f2mDUMIfl\r\nIApyabFRqMR8/rgP+lH4CyJUl8xVd4FwmolrIdoID7ujWa9vgUEJG2r04wIDAQAB\r\nAoGAPZzz96VYnwPGZrBBGMIPdhypf41nzVvPKUn83t1NPlY5YzkZ4OLlelZkXMjO\r\nha/9uta1j5fB0Y3JoPnwD5t/ts9+gCyXHK4qr7MgEk+MvDCG89rHXsHInlN2h2Ha\r\nQcHA8514WW/JG+zkpJ0Rw/lYrzzETjgdlFqXCHZpekhVAJECQQDxMGv4oU+vfUtg\r\nFpaevmvfGJ8B74VuqB3agMb3unUJznYCJkvlTyi9z4xcWYh8XUeDqOYIZ3cTWVKd\r\nmp0Vqv27AkEA1T1GKgprczeGvplKne5z7WJdVRIYEjFhfH5d08CBcQzxGPf8scwK\r\n0xbqU+To5/fifPeP5GgZrTh15vMgthbe+QJBAMc0mCj9iuRF1yig33xziIL2QfaG\r\nTy3LOwUKkctwPFSCKuOxn8PgsqS7NJHd/SXCoVtz97J/SlE32E2FszJ/TRsCQHHl\r\niZ2Y9S2UYf9aJ3XV0Mvht1JiGMNW5ug1Iu6gq0L0E68vfiSFhN6dJcprwU9toub2\r\n4D+yrsxMFQWnpTg9XRkCQCEBKhnInhcCk9x8S+zHvCyW0IVg7dfd+G+A6Yup+B7p\r\nfG7v3Juq/s47N4G4WmF78FH5BFKpm0pUF1u8ld1P3yY=\r\n-----END RSA PRIVATE KEY-----\r\n",
        cert: "-----BEGIN CERTIFICATE-----\r\nMIIC4TCCAkqgAwIBAgIQDHn9y02+Q1UUnqdnSTkPSDANBgkqhkiG9w0BAQsFADCB\r\npTELMAkGA1UEBhMCVVUxDjAMBgNVBAoTBXByb3h5MQswCQYDVQQIEwJVVTESMBAG\r\nA1UECxMJc3NsIFByb3h5MQ8wDQYDVQQDEwZSb290Q0ExCzAJBgNVBAYTAlVTMREw\r\nDwYDVQQIEwhWZXJnaW5pYTEPMA0GA1UECxMGQmVhdXR5MRMwEQYDVQQHEwpCbGFj\r\na3NidXJnMQ4wDAYDVQQKEwV2YWx1ZTAeFw0wNzA0MzAxNTQ1MjZaFw0yNzA0MzAx\r\nNjQ1MjZaMIGlMQswCQYDVQQGEwJVVTEOMAwGA1UEChMFcHJveHkxCzAJBgNVBAgT\r\nAlVVMRIwEAYDVQQLEwlzc2wgUHJveHkxDzANBgNVBAMTBlJvb3RDQTELMAkGA1UE\r\nBhMCVVMxETAPBgNVBAgTCFZlcmdpbmlhMQ8wDQYDVQQLEwZCZWF1dHkxEzARBgNV\r\nBAcTCkJsYWNrc2J1cmcxDjAMBgNVBAoTBXZhbHVlMIGfMA0GCSqGSIb3DQEBAQUA\r\nA4GNADCBiQKBgQDI5wR6cb6P6Dm0TMaOdv3Md8X5IjDETAVQA/NTKWjBv2uOeBKS\r\nADVbqotBXkHhvlio5ceayJLzPsul6zN218fkUTOZL1XCkJR3m9MdpL/f2mDUMIfl\r\nIApyabFRqMR8/rgP+lH4CyJUl8xVd4FwmolrIdoID7ujWa9vgUEJG2r04wIDAQAB\r\noxAwDjAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBCwUAA4GBAC/O8N6mIPIdB3cN\r\ne5OUlqsGzXIGWn70CqroHQKIrxzWw/ardhxaW1xVbSDIkFA3hkaJmzgTwxeH+yCs\r\noIvTSbY4wQwxl+034zNYl4+tZ4oh0Cvcyfdm9Pp8hgTS+sTPm9ZRybFz1r0UEmK8\r\nGE3y8oJEf22xo4kM+3zw4Yc7mfx0\r\n-----END CERTIFICATE-----\r\n"
    };
    const certCache = new Map();
    const getCertificate = async (serverName) => {
        if (!certCache.has(serverName)) {
            const t = generateCertForHostname(serverName, rootCA);
            certCache.set(serverName, t);
            return t;
        }
        return certCache.get(serverName);
    };
    return { rootCA, getCertificate };
};

adone.run({
    async initialize() {
        this.defineArguments({
            options: [
                { name: "--port", type: Number, default: 31337 },
                { name: "--proxy", type: String }
            ]
        });
    },
    async main(args, opts) {
        const { net: { proxy: { http: { Server: HTTPProxyServer } } }, util } = adone;
        let proxy = null;
        if (opts.has("proxy")) {
            const t = opts.get("proxy").split(":");
            proxy = {
                protocol: "http",
                host: t[0],
                port: t[1]
            };
        }
        const server = new HTTPProxyServer({
            https: httpsHandler(),
            getInternalPort: async () => 0  // random port
        });
        server
            .use(async (ctx, next) => {
                const start = new Date();
                if (ctx.type === "connect") {
                    ctx.decryptHTTPS = true;
                    ctx.handleUpgrade = true;
                }
                if (ctx.type === "upgrade") {
                    ctx.handleWebsocket = true;
                }
                if (ctx.type === "websocket") {
                    const s = adone.sprintf("%s <-> %s:%s", ctx.localRequest.href, ctx.clientAddress, ctx.clientPort);
                    adone.info("start websocket session %s", s);
                    ctx.incoming(async (ctx, next) => {
                        adone.info("[WS] [%s] -> %s", s, ctx.data.toString());
                        return next();
                    });
                    ctx.outgoing(async (ctx, next) => {
                        adone.info("[WS] [%s] <- %s", s, ctx.data.toString());
                        return next();
                    });
                }
                if (proxy) {
                    ctx.proxy = proxy;
                }
                let requestBody = null;
                let responseBody = null;
                if (ctx.type === "http") {
                    requestBody = new adone.collection.BufferList();
                    responseBody = new adone.collection.BufferList();
                    ctx.saveRequestBody(requestBody);
                    ctx.saveResponseBody(responseBody);
                }
                let incoming = null;
                let outgoing = null;
                if (ctx.type === "stream") {
                    incoming = new adone.collection.BufferList();
                    outgoing = new adone.collection.BufferList();
                    ctx.saveIncoming(incoming);
                    ctx.saveOutgoing(outgoing);
                }
                const err = await next().then(adone.noop, adone.identity);
                if (ctx.type === "http") {
                    adone.info(
                        "%s %s %s %s",
                        ctx.localRequest.method,
                        ctx.remoteResponse && ctx.remoteResponse.status,
                        ctx.localRequest.href,
                        util.humanizeTime(new Date() - start)
                    );
                    adone.info("request body");
                    requestBody = requestBody.slice();
                    adone.log(requestBody.length, requestBody.toString("hex"));
                    adone.info("response body");
                    responseBody = responseBody.slice();
                    adone.log(responseBody.length, responseBody.toString("hex"));
                } else if (ctx.type === "connect") {
                    adone.info(
                        "%s %s %s",
                        ctx.localRequest.method,
                        ctx.localRequest.url,
                        util.humanizeTime(new Date() - start)
                    );
                } else if (ctx.type === "upgrade") {
                    adone.info(
                        "%s upgrade to %s",
                        ctx.parent.localRequest.url,
                        ctx.protocol
                    );
                } else if (ctx.type === "stream" && (ctx.parent.type === "connect" || ctx.parent.type === "upgrade")) {
                    adone.info(
                        "stream %s %s:%s <-> %s:%s",
                        ctx.parent.type === "connect" ? ctx.parent.localRequest.url : ctx.parent.localRequest.href,
                        ctx.clientAddress,
                        ctx.clientPort,
                        ctx.remoteAddress,
                        ctx.remotePort,
                        util.humanizeTime(new Date() - start)
                    );
                    adone.info("incoming");
                    incoming = incoming.slice();
                    adone.log(incoming.length, incoming.toString("hex"));
                    adone.info("outgoing");
                    outgoing = outgoing.slice();
                    adone.log(outgoing.length, outgoing.toString("hex"));
                } else if (ctx.type === "websocket") {
                    const s = adone.sprintf("%s <-> %s:%s", ctx.localRequest.href, ctx.clientAddress, ctx.clientPort);
                    adone.info("end websocket session %s", s);
                }
                if (err) {
                    adone.error(err.stack);
                }
            })
            .use(async (ctx) => {
                if (ctx.type === "http") {
                    if (ctx.localRequest.url === "http://ipecho.net/plain") {
                        await ctx.makeRemoteRequest();
                        ctx.remoteResponse.body = "2.2.2.2";
                        await ctx.writeLocalResponse();
                        return;
                    }
                    if (ctx.localRequest.url.startsWith("http://doesntexist.yeah")) {
                        ctx.fakeResponse({
                            status: "200",
                            body: "I am here",
                            headers: {
                                Hello: "World!"
                            }
                        });
                        await adone.promise.delay(50);
                        await ctx.writeLocalResponse();
                        return;
                    }
                }
                await ctx.connect();
            });
        await server.listen(opts.get("port"), "0.0.0.0");
        const address = server.address();
        adone.info("listening on %s:%s", address.address, address.port);
    }
});
