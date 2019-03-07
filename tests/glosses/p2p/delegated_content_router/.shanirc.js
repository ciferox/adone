const {
    ipfs: { ipfsdCtl: { createServer } }
} = adone;

export default (ctx) => {
    const server = createServer();

    ctx.before(server.start.bind(server));
    ctx.after(server.stop.bind(server));
};
