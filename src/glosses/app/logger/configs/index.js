adone.lazify({
    adone: () => adone.app.logger.addColors(require("./adone").default),
    cli: () => adone.app.logger.addColors(require("./cli").default),
    npm: () => adone.app.logger.addColors(require("./npm").default),
    syslog: () => adone.app.logger.addColors(require("./syslog").default)
}, exports, require);
