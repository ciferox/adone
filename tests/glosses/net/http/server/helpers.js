const { net: { http: { server: { Server } } }, std: { stream: { Duplex, Stream } } } = adone;

export const context = (req, res, server) => {
    const socket = new Duplex();
    req = adone.o({ headers: {}, socket }, Stream.Readable.prototype, req);
    res = adone.o({ _headers: {}, socket }, Stream.Writable.prototype, res);
    req.socket.remoteAddress = req.socket.remoteAddress || "127.0.0.1";
    server = server || new Server();
    res.getHeaders = () => res._headers || {};
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.setHeader = (k, v) => res._headers[k.toLowerCase()] = v;
    res.removeHeader = (k) => delete res._headers[k.toLowerCase()];
    return server.createContext(req, res);
};

export const request = (req, res, server) => context(req, res, server).request;

export const response = (req, res, server) => context(req, res, server).response;
