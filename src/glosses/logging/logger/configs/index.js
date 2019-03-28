adone.lazify({
    adone: () => adone.logging.logger.addColors(require("./adone").default),
    cli: () => adone.logging.logger.addColors(require("./cli").default),
    npm: () => adone.logging.logger.addColors(require("./npm").default),
    syslog: () => adone.logging.logger.addColors(require("./syslog").default)
}, exports, require);
