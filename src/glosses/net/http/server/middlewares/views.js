const { is, templating, std: { path }, promise } = adone;

export default function views(templatesPath = "views", options = {}) {
    let env;

    if (is.string(templatesPath)) {
        templatesPath = path.resolve(templatesPath);
        env = templating.nunjucks.configure(templatesPath, options);
    } else {
        env = templatesPath;  // predefined env
    }

    const _render = promise.promisify(env.render, { context: env });
    const _renderString = promise.promisify(env.renderString, { context: env });

    const render = function (name, ctx) {
        return _render(name, ctx).then((body) => {
            this.body = body;
        });
    };

    const renderString = function (str, ctx) {
        return _renderString(str, ctx).then((body) => {
            this.body = body;
        });
    };

    const views = (ctx, next) => {
        ctx.render = render;
        ctx.renderString = renderString;

        return next();
    };

    views.env = env;

    return views;
}
