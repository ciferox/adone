const {
    is,
    application,
    net: { util, http }
} = adone;

const {
    server: { middleware }
} = http;

export default class extends application.Subsystem {
    constructor() {
        super();

        this.config = null;
        this.server = null;
    }

    async initialize() {
        this.config = this.app._.config;
        
        const router = new http.server.middleware.router.Router();

        // Netron configuration handler
        router.get("/configuration/:id", (ctx) => {
            if (ctx.params.id) {
                ctx.body = {
                    options: this.config.netron.options,
                    port: this.config.netron.gates[0].port
                };
            }
        });

        // create http server and attach common middlewares
        this.server = new http.server.Server();
        await this.server.use(middleware.logger())
            .use(middleware.favicon(`${this.config.http.publicDir}/favicon.ico`))
            .use(router.routes())
            .use(middleware.rewrite(/^(?!^\/[^\\]*\.(\w+)$).*$/, "/index.html"))
            .use(middleware.serve(this.config.http.publicDir))
            .bind(this.config.http);

        adone.info(`http server started at ${util.humanizeAddr("http", this.config.http.port, this.config.http.host)}`);
    }

    async uninitialize() {
        if (!is.null(this.server)) {
            await this.server.unbind();
            adone.info("http server stopped");
        }
    }
}
