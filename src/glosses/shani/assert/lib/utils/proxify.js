import adone from "adone";
import config from "../config";
import getProperties from "./getProperties";

/*!
 * proxify utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # proxify(object)
 *
 * Return a proxy of given object that throws an error when a non-existent
 * property is read. By default, the root cause is assumed to be a misspelled
 * property, and thus an attempt is made to offer a reasonable suggestion from
 * the list of existing properties. However, if a nonChainableMethodName is
 * provided, then the root cause is instead a failure to invoke a non-chainable
 * method prior to reading the non-existent property.
 * 
 * If proxies are unsupported or disabled via the user's config, then
 * return object without modification.
 *
 * @param {Object} obj
 * @param {String} nonChainableMethodName
 * @namespace Utils
 * @name proxify
 */

export default function proxify(obj, nonChainableMethodName) {
    return new Proxy(obj, {
        get: function getProperty(target, property) {
            // This check is here because we should not throw errors on Symbol properties
            // such as `Symbol.toStringTag`.
            // The values for which an error should be thrown can be configured using
            // the `config.proxyExcludedKeys` setting.
            if (adone.is.string(property) &&
                config.proxyExcludedKeys.indexOf(property) === -1 &&
                !Reflect.has(target, property)) {
                // Special message for invalid property access of non-chainable methods.
                if (nonChainableMethodName) {
                    throw Error("Invalid property: " + nonChainableMethodName + "." +
                        property + ". See docs for proper usage of \"" +
                        nonChainableMethodName + "\".");
                }

                const orderedProperties = getProperties(target).filter(function (property) {
                    return !Object.prototype.hasOwnProperty(property) &&
                        ["_obj", "assert"].indexOf(property) === -1;
                }).sort(function (a, b) {
                    return adone.text.stringDistance(property, a) - adone.text.stringDistance(property, b);
                });

                if (orderedProperties.length && adone.text.stringDistance(orderedProperties[0], property) < 4) {
                    // If the property is reasonably close to an existing property,
                    // suggest that property to the user.
                    throw Error("Invalid property: " + property +
                        ". Did you mean \"" + orderedProperties[0] + "\"?");
                } else {
                    throw Error("Invalid property: " + property);
                }
            }

            return target[property];
        }
    });
}

