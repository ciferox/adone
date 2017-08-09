const {
    is,
    net: { util, http }
} = adone;

const {
    server: { middleware }
} = http;

export class HttpDispatcher {
    constructor(app, config) {
        this.config = config;
        this.server = null;
    }

    async initialize() {
        // create http server and attach common middlewares
        this.server = new http.server.Server();
        await this.server.use(middleware.logger())
            .use(middleware.favicon(`${this.config.publicDir}/favicon.ico`))
            .use(middleware.rewrite(/^(?!^\/[^\\]*\.(\w+)$).*$/, "/index.html"))
            .use(middleware.serve(this.config.publicDir))
            .bind(this.config);
        
        adone.info(`http server started at ${util.humanizeAddr("http", this.config.port, this.config.host)}`);
    }

    async uninitialize() {
        if (!is.null(this.server)) {
            await this.server.unbind();
            adone.info("http server stopped");
        }
    }
}
