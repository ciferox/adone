/**
 * Format functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */


export default function format(entity) {
    if (adone.is.string(entity)){
        return entity;
    }
    return adone.meta.inspect(entity, { minimal: true }).trim();
}
