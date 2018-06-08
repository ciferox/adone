import ReplaceableInitializationVariable from './ReplaceableInitializationVariable';
export default class ParameterVariable extends ReplaceableInitializationVariable {
    constructor(identifier) {
        super(identifier.name, identifier);
    }
}
