import { blank } from "../utils/object";
import CallOptions from "./CallOptions";
import { isUnknownKey } from "./variables/VariableReassignmentTracker";

const assembleMemberDescriptions = (memberDescriptions, inheritedDescriptions = null) => Object.create(inheritedDescriptions, memberDescriptions);

export const UNKNOWN_VALUE = { toString: () => "[[UNKNOWN]]" };
export const UNKNOWN_EXPRESSION = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getValue: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: (path) => path.length > 0,
    hasEffectsWhenAssignedAtPath: (path) => path.length > 0,
    hasEffectsWhenCalledAtPath: () => true,
    someReturnExpressionWhenCalledAtPath: () => true,
    toString: () => "[[UNKNOWN]]"
};
const returnsUnknown = { value: { returns: UNKNOWN_EXPRESSION, callsArgs: null } };
const callsArgReturnsUnknown = { value: { returns: UNKNOWN_EXPRESSION, callsArgs: [0] } };
export const UNKNOWN_ARRAY_EXPRESSION = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getValue: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: (path) => path.length > 1,
    hasEffectsWhenAssignedAtPath: (path) => path.length > 1,
    hasEffectsWhenCalledAtPath: (path, callOptions, options) => {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(arrayMembers, path[0], callOptions, options);
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            return someMemberReturnExpressionWhenCalled(arrayMembers, path[0], callOptions, predicateFunction, options);
        }
        return true;
    },
    toString: () => "[[UNKNOWN ARRAY]]"
};
const returnsArray = { value: { returns: UNKNOWN_ARRAY_EXPRESSION, callsArgs: null } };
const callsArgReturnsArray = { value: { returns: UNKNOWN_ARRAY_EXPRESSION, callsArgs: [0] } };
const UNKNOWN_LITERAL_BOOLEAN = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getValue: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: (path) => path.length > 1,
    hasEffectsWhenAssignedAtPath: (path) => path.length > 0,
    hasEffectsWhenCalledAtPath: (path) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath) || !literalBooleanMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath)
                || !literalBooleanMembers[subPath]
                || predicateFunction(options)(literalBooleanMembers[subPath].returns);
        }
        return true;
    },
    toString: () => "[[UNKNOWN BOOLEAN]]"
};
const returnsBoolean = { value: { returns: UNKNOWN_LITERAL_BOOLEAN, callsArgs: null } };
const callsArgReturnsBoolean = { value: { returns: UNKNOWN_LITERAL_BOOLEAN, callsArgs: [0] } };
const UNKNOWN_LITERAL_NUMBER = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getValue: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: (path) => path.length > 1,
    hasEffectsWhenAssignedAtPath: (path) => path.length > 0,
    hasEffectsWhenCalledAtPath: (path) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath) || !literalNumberMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath)
                || !literalNumberMembers[subPath]
                || predicateFunction(options)(literalNumberMembers[subPath].returns);
        }
        return true;
    },
    toString: () => "[[UNKNOWN NUMBER]]"
};
const returnsNumber = { value: { returns: UNKNOWN_LITERAL_NUMBER, callsArgs: null } };
const callsArgReturnsNumber = { value: { returns: UNKNOWN_LITERAL_NUMBER, callsArgs: [0] } };
const UNKNOWN_LITERAL_STRING = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getValue: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: (path) => path.length > 1,
    hasEffectsWhenAssignedAtPath: (path) => path.length > 0,
    hasEffectsWhenCalledAtPath: (path) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath) || !literalStringMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath)
                || !literalStringMembers[subPath]
                || predicateFunction(options)(literalStringMembers[subPath].returns);
        }
        return true;
    },
    toString: () => "[[UNKNOWN STRING]]"
};
const returnsString = { value: { returns: UNKNOWN_LITERAL_STRING, callsArgs: null } };
const callsSecondArgReturnsString = { value: { returns: UNKNOWN_LITERAL_STRING, callsArgs: [1] } };
export const UNKNOWN_OBJECT_EXPRESSION = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getValue: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: (path) => path.length > 1,
    hasEffectsWhenAssignedAtPath: (path) => path.length > 1,
    hasEffectsWhenCalledAtPath: (path) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath) || !objectMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return isUnknownKey(subPath)
                || !objectMembers[subPath]
                || predicateFunction(options)(objectMembers[subPath].returns);
        }
        return true;
    },
    toString: () => "[[UNKNOWN OBJECT]]"
};
export const objectMembers = assembleMemberDescriptions({
    hasOwnProperty: returnsBoolean,
    isPrototypeOf: returnsBoolean,
    propertyIsEnumerable: returnsBoolean,
    toLocaleString: returnsString,
    toString: returnsString,
    valueOf: returnsUnknown
});
export const arrayMembers = assembleMemberDescriptions({
    concat: returnsArray,
    copyWithin: returnsArray,
    every: callsArgReturnsBoolean,
    fill: returnsArray,
    filter: callsArgReturnsArray,
    find: callsArgReturnsUnknown,
    findIndex: callsArgReturnsNumber,
    forEach: callsArgReturnsUnknown,
    includes: returnsBoolean,
    indexOf: returnsNumber,
    join: returnsString,
    lastIndexOf: returnsNumber,
    map: callsArgReturnsArray,
    pop: returnsUnknown,
    push: returnsNumber,
    reduce: callsArgReturnsUnknown,
    reduceRight: callsArgReturnsUnknown,
    reverse: returnsArray,
    shift: returnsUnknown,
    slice: returnsArray,
    some: callsArgReturnsBoolean,
    sort: callsArgReturnsArray,
    splice: returnsArray,
    unshift: returnsNumber
}, objectMembers);
const literalBooleanMembers = assembleMemberDescriptions({
    valueOf: returnsBoolean
}, objectMembers);
const literalNumberMembers = assembleMemberDescriptions({
    toExponential: returnsString,
    toFixed: returnsString,
    toLocaleString: returnsString,
    toPrecision: returnsString,
    valueOf: returnsNumber
}, objectMembers);
const literalStringMembers = assembleMemberDescriptions({
    charAt: returnsString,
    charCodeAt: returnsNumber,
    codePointAt: returnsNumber,
    concat: returnsString,
    includes: returnsBoolean,
    endsWith: returnsBoolean,
    indexOf: returnsNumber,
    lastIndexOf: returnsNumber,
    localeCompare: returnsNumber,
    match: returnsBoolean,
    normalize: returnsString,
    padEnd: returnsString,
    padStart: returnsString,
    repeat: returnsString,
    replace: callsSecondArgReturnsString,
    search: returnsNumber,
    slice: returnsString,
    split: returnsArray,
    startsWith: returnsBoolean,
    substr: returnsString,
    substring: returnsString,
    toLocaleLowerCase: returnsString,
    toLocaleUpperCase: returnsString,
    toLowerCase: returnsString,
    toUpperCase: returnsString,
    trim: returnsString,
    valueOf: returnsString
}, objectMembers);
export const getLiteralMembersForValue = function (value) {
    switch (typeof value) {
        case "boolean":
            return literalBooleanMembers;
        case "number":
            return literalNumberMembers;
        case "string":
            return literalStringMembers;
        default:
            return blank();
    }
};

export const hasMemberEffectWhenCalled = function (members, memberName, callOptions, options) {
    return isUnknownKey(memberName)
        || !members[memberName]
        || (members[memberName].callsArgs
            && members[memberName].callsArgs.some((argIndex) => callOptions.args[argIndex]
                && callOptions.args[argIndex].hasEffectsWhenCalledAtPath([], CallOptions.create({
                    withNew: false,
                    args: [],
                    callIdentifier: {} // make sure the caller is unique to avoid this check being ignored
                }), options.getHasEffectsWhenCalledOptions())));
};

export const someMemberReturnExpressionWhenCalled = function (members, memberName, callOptions, predicateFunction, options) {
    return hasMemberEffectWhenCalled(members, memberName, callOptions, options)
        // if calling has no effect, memberName is a string and members[memberName] exists
        || predicateFunction(options)(members[memberName].returns);
};
