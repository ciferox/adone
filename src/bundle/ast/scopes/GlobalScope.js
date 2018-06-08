import GlobalVariable from '../variables/GlobalVariable';
import Scope from './Scope';
export default class GlobalScope extends Scope {
    findVariable(name) {
        if (!this.variables[name]) {
            this.variables[name] = new GlobalVariable(name);
        }
        return this.variables[name];
    }
    deshadow(names, children = this.children) {
        super.deshadow(names, children);
    }
}
