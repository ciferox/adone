/*!
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Dependencies that are used for multiple exports are required here only once
 */

import adone from "adone";
import * as pathval from "./pathval";
import test from "./test";
import expectTypes from "./expectTypes";
import getMessage from "./getMessage";
import getActual from "./getActual";
import inspect from "./inspect";
import objDisplay from "./objDisplay";
import flag from "./flag";
import transferFlags from "./transferFlags";
import addProperty from "./addProperty";
import addMethod from "./addMethod";
import overwriteProperty from "./overwriteProperty";
import overwriteMethod from "./overwriteMethod";
import addChainableMethod from "./addChainableMethod";
import overwriteChainableMethod from "./overwriteChainableMethod";
import compareByInspect from "./compareByInspect";
import getOwnEnumerablePropertySymbols from "./getOwnEnumerablePropertySymbols";
import getOwnEnumerableProperties from "./getOwnEnumerableProperties";
import * as checkError from "./check_error";
import proxify from "./proxify";

export {
    test,
    expectTypes,
    getMessage,
    getActual,
    inspect,
    objDisplay,
    flag,
    transferFlags,
    addProperty,
    addMethod,
    overwriteProperty,
    overwriteMethod,
    addChainableMethod,
    overwriteChainableMethod,
    compareByInspect,
    getOwnEnumerablePropertySymbols,
    getOwnEnumerableProperties,
    checkError,
    proxify
};
export const type = adone.util.typeDetect;
export const eql = adone.util.deepEqual;
export const getPathInfo = pathval.getPathInfo;
export const hasProperty = pathval.hasProperty;
export const getName = adone.util.functionName;


