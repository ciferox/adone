import Variable from './Variable';
export default class ExternalVariable extends Variable {
    constructor(module, name) {
        super(name);
        this.module = module;
        this.isNamespace = name === '*';
        this.referenced = false;
    }
    addReference(identifier) {
        this.referenced = true;
        if (this.name === 'default' || this.name === '*') {
            this.module.suggestName(identifier.name);
        }
    }
    include() {
        if (!this.included) {
            this.included = true;
            this.module.used = true;
        }
    }
}
ExternalVariable.prototype.isExternal = true;
