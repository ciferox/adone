const __ = adone.private(adone.datetime);

export const configFromObject = (config) => {
    if (config._d) {
        return;
    }

    const i = __.unit.alias.normalizeObjectUnits(config._i);
    config._a = [i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond].map((obj) => {
        return obj && parseInt(obj, 10);
    });

    __.create.configFromArray(config);
};
