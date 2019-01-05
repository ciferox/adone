
adone.lazify({
    cli: () => adone.app.logger.addColors(require("./cli")),
    npm: () => adone.app.logger.addColors(require("./npm")),
    syslog: () => adone.app.logger.addColors(require("./syslog"))
}, exports, require);
