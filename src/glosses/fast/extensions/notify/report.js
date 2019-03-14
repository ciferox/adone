const {
    error,
    std: { path },
    is,
    templating: { dot },
    util,
    text
} = adone;

const defaults = {
    error: {
        icon: path.join(adone.SHARE_PATH, "media", "logo-err.png")
    },
    regular: {
        icon: path.join(adone.SHARE_PATH, "media", "logo-norm.png")
    }
};

const log = (options, isError) => {
    const message = `[${options.title}] ${options.message}`;
    if (isError) {
        console.error(message);
    } else {
        console.info(message);
    }
};

const createRenderFunction = (template) => {
    let fn;
    return (obj) => {
        try {
            if (!fn) {
                fn = dot.template(template, { ...dot.templateSettings, strip: false });
            }
            return fn(obj);
        } catch (err) {
            adone.logWarn(`Notify string rendering failed due to: ${err.message}`);
            return template;
        }
    };
};

const stripAnsi = (obj) => {
    for (const [k, v] of util.entries(obj)) {
        switch (k) {
            case "message":
            case "open":
            case "subtitle":
            case "title":
                obj[k] = text.stripAnsi(v);
                break;
        }
    }
    return obj;
};

const generate = (outputData, object, title, message, subtitle, open, templateOptions) => {
    if (object instanceof Error) {
        const titleTemplate = createRenderFunction(title);
        const messageTemplate = createRenderFunction(message);
        const openTemplate = createRenderFunction(open);
        const subtitleTemplate = createRenderFunction(subtitle);

        return {
            ...defaults.error,
            ...outputData,
            title: titleTemplate({
                error: object,
                options: templateOptions
            }),
            message: messageTemplate({
                error: object,
                options: templateOptions
            }),
            open: openTemplate({
                error: object,
                options: templateOptions
            }),
            subtitle: subtitleTemplate({
                error: object,
                options: templateOptions
            })
        };
    }

    return {
        ...defaults.regular,
        ...outputData,
        title: createRenderFunction(title)({
            file: object,
            options: templateOptions
        }),
        message: createRenderFunction(message)({
            file: object,
            options: templateOptions
        })
    };
};

const constructOptions = (options, object, templateOptions) => {
    let message = object.path || object.message || object;
    let title = object instanceof Error ? "Error" : "Notification";
    let open = "";
    let subtitle = "";
    let outputData = {};

    if (is.function(options)) {
        message = options(object);
        if (is.object(message)) {
            options = message;
        }
        if (!message) {
            return false;
        }
    }

    if (is.string(options)) {
        message = options;
    }

    if (is.object(options)) {
        outputData = { console: true, gui: true, ...options };

        if (is.function(outputData.title)) {
            title = outputData.title(object);
        } else {
            title = outputData.title || title;
        }

        if (is.function(outputData.subtitle)) {
            subtitle = outputData.subtitle(object);
        } else {
            subtitle = outputData.subtitle || subtitle;
        }

        if (is.function(outputData.open)) {
            open = outputData.open(object);
        } else {
            open = outputData.open || open;
        }

        if (is.function(outputData.message)) {
            message = outputData.message(object);
            if (!message) {
                return false;
            }
        } else {
            message = outputData.message || message;
        }
    }
    return generate(outputData, object, title, message, subtitle, open, templateOptions);
};

export default async function report(reporter, message, options, templateOptions) {
    if (!reporter) {
        throw new error.InvalidArgumentException("No reporter specified");
    }

    options = constructOptions(options, message, templateOptions);

    if (!options) {
        return;
    }

    if (!options.notifier && options.console) {
        await log(options, message instanceof Error);
    }
    if (options.notifier || options.gui) {
        await reporter(stripAnsi(options));
    }
}
