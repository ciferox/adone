import pureFunctions from '../nodes/shared/pureFunctions';
import Variable from './Variable';
export default class GlobalVariable extends Variable {
    constructor() {
        super(...arguments);
        this.included = true;
    }
    hasEffectsWhenAccessedAtPath(path) {
        // path.length == 0 can also have an effect but we postpone this for now
        return (path.length > 0 &&
            !this.isPureFunctionMember(path) &&
            !(this.name === 'Reflect' && path.length === 1));
    }
    hasEffectsWhenCalledAtPath(path) {
        return !pureFunctions[[this.name, ...path].join('.')];
    }
    isPureFunctionMember(path) {
        return (pureFunctions[[this.name, ...path].join('.')] ||
            (path.length >= 1 && pureFunctions[[this.name, ...path.slice(0, -1)].join('.')]) ||
            (path.length >= 2 &&
                pureFunctions[[this.name, ...path.slice(0, -2)].join('.')] &&
                path[path.length - 2] === 'prototype'));
    }
}
GlobalVariable.prototype.isExternal = true;
