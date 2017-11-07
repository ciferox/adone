const {
    is,
    std: {
        fs,
        url,
        http
    },
    util
} = adone;

const __ = adone.lazify({
    back: "./__/back",
    DelayedBody: "./__/delayed_body",
    globalEmitter: "./__/global_emitter",
    intercept: "./__/intercept",
    Interceptor: "./__/interceptor",
    matchBody: "./__/match_body",
    recorder: "./__/recorder",
    requestOverrider: "./__/request_overrider",
    Socket: "./__/socket",
    util: "./__/util",
    Scope: "./__/scope"
}, null, require);

__.ClientRequest = http.ClientRequest;
__.IncomingMessage = http.IncomingMessage;
__.OutgoingMessage = http.OutgoingMessage;


export default function createScope(basePath, options) {
    return new __.Scope(basePath, options);
}

createScope.cleanAll = () => {
    __.intercept.removeAll();
    return createScope;
};

createScope.loadDefs = (path) => {
    const contents = fs.readFileSync(path);
    return JSON.parse(contents);
};

createScope.load = (path) => createScope.define(createScope.loadDefs(path));


const getStatusFromDefinition = (nockDef) => {
    //  Backward compatibility for when `status` was encoded as string in `reply`.
    if (!is.undefined(nockDef.reply)) {
        //  Try parsing `reply` property.
        const parsedReply = parseInt(nockDef.reply, 10);
        if (is.number(parsedReply)) {
            return parsedReply;
        }
    }

    const DEFAULT_STATUS_OK = 200;
    return nockDef.status || DEFAULT_STATUS_OK;
};

const getScopeFromDefinition = (nockDef) => {

    //  Backward compatibility for when `port` was part of definition.
    if (!is.undefined(nockDef.port)) {
        //  Include `port` into scope if it doesn't exist.
        const options = url.parse(nockDef.scope);
        if (is.null(options.port)) {
            return `${nockDef.scope}:${nockDef.port}`;
        }
        if (parseInt(options.port) !== parseInt(nockDef.port)) {
            throw new Error("Mismatched port numbers in scope and port properties of nock definition.");
        }

    }

    return nockDef.scope;
};

const tryJsonParse = (string) => {
    try {
        return JSON.parse(string);
    } catch (err) {
        return string;
    }
};

createScope.define = (nockDefs) => {

    const nocks = [];

    nockDefs.forEach((nockDef) => {

        const nscope = getScopeFromDefinition(nockDef);
        const npath = nockDef.path;
        const method = nockDef.method.toLowerCase() || "get";
        const status = getStatusFromDefinition(nockDef);
        const rawHeaders = nockDef.rawHeaders || [];
        const reqheaders = nockDef.reqheaders || {};
        const badheaders = nockDef.badheaders || [];
        const body = nockDef.body || "";
        let options = nockDef.options || {};

        //  We use request headers for both filtering (see below) and mocking.
        //  Here we are setting up mocked request headers but we don't want to
        //  be changing the user's options object so we clone it first.
        options = util.clone(options) || {};
        options.reqheaders = reqheaders;
        options.badheaders = badheaders;

        //  Response is not always JSON as it could be a string or binary data or
        //  even an array of binary buffers (e.g. when content is enconded)
        let response;
        if (!nockDef.response) {
            response = "";
        } else {
            response = is.string(nockDef.response) ? tryJsonParse(nockDef.response) : nockDef.response;
        }

        let nock;
        if (body === "*") {
            nock = createScope(nscope, options).filteringRequestBody(() => {
                return "*";
            })[method](npath, "*").reply(status, response, rawHeaders);
        } else {
            nock = createScope(nscope, options);
            //  If request headers were specified filter by them.
            if (!is.emptyObject(reqheaders)) {
                for (const k in reqheaders) {
                    nock.matchHeader(k, reqheaders[k]);
                }
            }
            if (nockDef.filteringRequestBody) {
                nock.filteringRequestBody(nockDef.filteringRequestBody);
            }
            nock.intercept(npath, method, body).reply(status, response, rawHeaders);
        }

        nocks.push(nock);

    });

    return nocks;
};

adone.lazify({
    activate: () => __.intercept.activate,
    isActive: () => __.intercept.isActive,
    isDone: () => __.intercept.isDone,
    pendingMocks: () => __.intercept.pendingMocks,
    activeMocks: () => __.intercept.activeMocks,
    removeInterceptor: () => __.intercept.removeInterceptor,
    disableNetConnect: () => __.intercept.disableNetConnect,
    enableNetConnect: () => __.intercept.enableNetConnect,
    emitter: () => __.globalEmitter,
    back: () => __.back,
    restore: () => __.recorder.restore
}, createScope);

createScope.recorder = adone.lazify({
    rec: () => __.recorder.record,
    clear: () => __.recorder.clear,
    play: () => __.recorder.outputs
});

adone.definePrivate(__, createScope);
