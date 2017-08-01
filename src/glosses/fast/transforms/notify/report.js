const { x, vendor, std: { path }, is } = adone;

const defaults = {
    error: {
        icon: path.join(adone.appinstance.adoneEtcPath, "media", "logo-err.png")
    },
    regular: {
        icon: path.join(adone.appinstance.adoneEtcPath, "media", "logo-norm.png")
    }
};

const log = (options, isError) => {
    const message = `[${options.title}] ${options.message}`;
    if (isError) {
        adone.error(message);
    } else {
        adone.info(message);
    }
};

const generate = (outputData, object, title, message, subtitle, open, templateOptions) => {
    if (object instanceof Error) {
        const titleTemplate = vendor.lodash.template(title);
        const messageTemplate = vendor.lodash.template(message);
        const openTemplate = vendor.lodash.template(open);
        const subtitleTemplate = vendor.lodash.template(subtitle);

        return vendor.lodash.extend(defaults.error, outputData, {
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
        });
    }

    return vendor.lodash.extend(defaults.regular, outputData, {
        title: vendor.lodash.template(title)({
            file: object,
            options: templateOptions
        }),
        message: vendor.lodash.template(message)({
            file: object,
            options: templateOptions
        })
    });
};

const constructOptions = (options, object, templateOptions) => {
    let message = object.path || object.message || object;
    let title = object instanceof Error ? "Error" : "Notification";
    let open = "";
    let subtitle = "";
    let outputData = {};

    if (is.function(options)) {
        // $FlowIgnore: is a function
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
        outputData = vendor.lodash.extend(true, { console: true, gui: true }, options);
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
        throw new x.InvalidArgument("No reporter specified");
    }

    options = constructOptions(options, message, templateOptions);
    if (!options) {
        return;
    }
    if (!options.notifier && options.console) {
        await log(options, message instanceof Error);
    }
    if (options.notifier || options.gui) {
        await reporter(options);
    }
}
