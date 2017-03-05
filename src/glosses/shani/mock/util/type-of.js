/**
 * Format functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */
import adone from "adone";

export default function typeOf(value) {
    return adone.util.typeDetect(value).toLowerCase();
}
