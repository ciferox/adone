import { isRef, create as createRef } from "./ref";

const {
    assert,
    is
} = adone;

export const schema = function (Joi, config) {
    if (!is.nil(config) && typeof config === "object") {

        if (config.isJoi) {
            return config;
        }

        if (is.array(config)) {
            return Joi.alternatives().try(config);
        }

        if (config instanceof RegExp) {
            return Joi.string().regex(config);
        }

        if (config instanceof Date) {
            return Joi.date().valid(config);
        }

        return Joi.object().keys(config);
    }

    if (is.string(config)) {
        return Joi.string().valid(config);
    }

    if (is.number(config)) {
        return Joi.number().valid(config);
    }

    if (is.boolean(config)) {
        return Joi.boolean().valid(config);
    }

    if (isRef(config)) {
        return Joi.valid(config);
    }

    assert(is.null(config), config ? `Invalid schema content: ${config}` : "Invalid schema content: ");

    return Joi.valid(null);
};

export const ref = (id) => isRef(id) ? id : createRef(id);
