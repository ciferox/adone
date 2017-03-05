import { normalizeObjectUnits } from "../units/aliases";
import { configFromArray } from "./from-array";

export function configFromObject(config) {
    if (config._d) {
        return;
    }

    const i = normalizeObjectUnits(config._i);
    config._a = [i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond].map((obj) => {
        return obj && parseInt(obj, 10);
    });

    configFromArray(config);
}
