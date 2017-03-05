/**
 * Core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
import wrapMethod from "./wrap-method";
import deepEqual from "./deep-equal";
import format from "./format";
import extend from "./extend";
import typeOf from "./type-of";
import functionName from "./function-name";
import functionToString from "./function-to-string";
import iterableToString from "./iterable-to-string";
import getPropertyDescriptor from "./get-property-descriptor";
import getConfig from "./get-config";
import defaultConfig from "./default-config";
import timesInWords from "./times-in-words";
import orderByFirstCall from "./order-by-first-call";
import walk from "./walk";
import restore from "./restore";

export {
    wrapMethod, deepEqual, format, extend, typeOf, functionName,
    functionToString, iterableToString, getPropertyDescriptor, getConfig,
    defaultConfig, timesInWords, orderByFirstCall, walk, restore
};
