import CallOptions from './CallOptions';
export const UNKNOWN_KEY = { UNKNOWN_KEY: true };
export const EMPTY_PATH = [];
export const UNKNOWN_PATH = [UNKNOWN_KEY];
function assembleMemberDescriptions(memberDescriptions, inheritedDescriptions = null) {
    return Object.create(inheritedDescriptions, memberDescriptions);
}
export const UNKNOWN_VALUE = { UNKNOWN_VALUE: true };
export const UNKNOWN_EXPRESSION = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getLiteralValueAtPath: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: path => path.length > 0,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: () => true,
    someReturnExpressionWhenCalledAtPath: () => true,
    toString: () => '[[UNKNOWN]]'
};
const returnsUnknown = {
    value: { returns: UNKNOWN_EXPRESSION, callsArgs: null, mutatesSelf: false }
};
const mutatesSelfReturnsUnknown = {
    value: { returns: UNKNOWN_EXPRESSION, callsArgs: null, mutatesSelf: true }
};
const callsArgReturnsUnknown = {
    value: { returns: UNKNOWN_EXPRESSION, callsArgs: [0], mutatesSelf: false }
};
export const UNKNOWN_ARRAY_EXPRESSION = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getLiteralValueAtPath: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 1,
    hasEffectsWhenCalledAtPath: (path, callOptions, options) => {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(arrayMembers, path[0], false, callOptions, options);
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            return someMemberReturnExpressionWhenCalled(arrayMembers, path[0], callOptions, predicateFunction, options);
        }
        return true;
    },
    toString: () => '[[UNKNOWN ARRAY]]'
};
const returnsArray = {
    value: { returns: UNKNOWN_ARRAY_EXPRESSION, callsArgs: null, mutatesSelf: false }
};
const mutatesSelfReturnsArray = {
    value: { returns: UNKNOWN_ARRAY_EXPRESSION, callsArgs: null, mutatesSelf: true }
};
const callsArgReturnsArray = {
    value: { returns: UNKNOWN_ARRAY_EXPRESSION, callsArgs: [0], mutatesSelf: false }
};
const callsArgMutatesSelfReturnsArray = {
    value: { returns: UNKNOWN_ARRAY_EXPRESSION, callsArgs: [0], mutatesSelf: true }
};
const UNKNOWN_LITERAL_BOOLEAN = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getLiteralValueAtPath: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: path => {
        if (path.length === 1) {
            const subPath = path[0];
            return typeof subPath !== 'string' || !literalBooleanMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return (typeof subPath !== 'string' ||
                !literalBooleanMembers[subPath] ||
                predicateFunction(options, literalBooleanMembers[subPath].returns));
        }
        return true;
    },
    toString: () => '[[UNKNOWN BOOLEAN]]'
};
const returnsBoolean = {
    value: { returns: UNKNOWN_LITERAL_BOOLEAN, callsArgs: null, mutatesSelf: false }
};
const callsArgReturnsBoolean = {
    value: { returns: UNKNOWN_LITERAL_BOOLEAN, callsArgs: [0], mutatesSelf: false }
};
const UNKNOWN_LITERAL_NUMBER = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getLiteralValueAtPath: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: path => {
        if (path.length === 1) {
            const subPath = path[0];
            return typeof subPath !== 'string' || !literalNumberMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return (typeof subPath !== 'string' ||
                !literalNumberMembers[subPath] ||
                predicateFunction(options, literalNumberMembers[subPath].returns));
        }
        return true;
    },
    toString: () => '[[UNKNOWN NUMBER]]'
};
const returnsNumber = {
    value: { returns: UNKNOWN_LITERAL_NUMBER, callsArgs: null, mutatesSelf: false }
};
const mutatesSelfReturnsNumber = {
    value: { returns: UNKNOWN_LITERAL_NUMBER, callsArgs: null, mutatesSelf: true }
};
const callsArgReturnsNumber = {
    value: { returns: UNKNOWN_LITERAL_NUMBER, callsArgs: [0], mutatesSelf: false }
};
const UNKNOWN_LITERAL_STRING = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getLiteralValueAtPath: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: path => {
        if (path.length === 1) {
            const subPath = path[0];
            return typeof subPath !== 'string' || !literalStringMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return (typeof subPath !== 'string' ||
                !literalStringMembers[subPath] ||
                predicateFunction(options, literalStringMembers[subPath].returns));
        }
        return true;
    },
    toString: () => '[[UNKNOWN STRING]]'
};
const returnsString = {
    value: { returns: UNKNOWN_LITERAL_STRING, callsArgs: null, mutatesSelf: false }
};
export const UNKNOWN_OBJECT_EXPRESSION = {
    reassignPath: () => { },
    forEachReturnExpressionWhenCalledAtPath: () => { },
    getLiteralValueAtPath: () => UNKNOWN_VALUE,
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 1,
    hasEffectsWhenCalledAtPath: path => {
        if (path.length === 1) {
            const subPath = path[0];
            return typeof subPath !== 'string' || !objectMembers[subPath];
        }
        return true;
    },
    someReturnExpressionWhenCalledAtPath: (path, _callOptions, predicateFunction, options) => {
        if (path.length === 1) {
            const subPath = path[0];
            return (typeof subPath !== 'string' ||
                !objectMembers[subPath] ||
                predicateFunction(options, objectMembers[subPath].returns));
        }
        return true;
    },
    toString: () => '[[UNKNOWN OBJECT]]'
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
    copyWithin: mutatesSelfReturnsArray,
    every: callsArgReturnsBoolean,
    fill: mutatesSelfReturnsArray,
    filter: callsArgReturnsArray,
    find: callsArgReturnsUnknown,
    findIndex: callsArgReturnsNumber,
    forEach: callsArgReturnsUnknown,
    includes: returnsBoolean,
    indexOf: returnsNumber,
    join: returnsString,
    lastIndexOf: returnsNumber,
    map: callsArgReturnsArray,
    pop: mutatesSelfReturnsUnknown,
    push: mutatesSelfReturnsNumber,
    reduce: callsArgReturnsUnknown,
    reduceRight: callsArgReturnsUnknown,
    reverse: mutatesSelfReturnsArray,
    shift: mutatesSelfReturnsUnknown,
    slice: returnsArray,
    some: callsArgReturnsBoolean,
    sort: callsArgMutatesSelfReturnsArray,
    splice: mutatesSelfReturnsArray,
    unshift: mutatesSelfReturnsNumber
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
    replace: {
        value: { returns: UNKNOWN_LITERAL_STRING, callsArgs: [1], mutatesSelf: false }
    },
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
export function getLiteralMembersForValue(value) {
    switch (typeof value) {
        case 'boolean':
            return literalBooleanMembers;
        case 'number':
            return literalNumberMembers;
        case 'string':
            return literalStringMembers;
        default:
            return Object.create(null);
    }
}
export function hasMemberEffectWhenCalled(members, memberName, parentIncluded, callOptions, options) {
    if (typeof memberName !== 'string' || !members[memberName])
        return true;
    if (members[memberName].mutatesSelf && parentIncluded)
        return true;
    if (!members[memberName].callsArgs)
        return false;
    for (const argIndex of members[memberName].callsArgs) {
        if (callOptions.args[argIndex] &&
            callOptions.args[argIndex].hasEffectsWhenCalledAtPath([], CallOptions.create({
                withNew: false,
                args: [],
                callIdentifier: {} // make sure the caller is unique to avoid this check being ignored
            }), options.getHasEffectsWhenCalledOptions()))
            return true;
    }
    return false;
}
export function someMemberReturnExpressionWhenCalled(members, memberName, callOptions, predicateFunction, options) {
    return (hasMemberEffectWhenCalled(members, memberName, false, callOptions, options) ||
        // if calling has no effect, memberName is a string and members[memberName] exists
        predicateFunction(options, members[memberName].returns));
}
