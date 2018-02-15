import Scope from "./Scope";
export default class BlockScope extends Scope {
    addDeclaration(identifier, options = {
        isHoisted: false
    }) {
        if (options.isHoisted) {
            return this.parent.addDeclaration(identifier, options);
        }
        
        return super.addDeclaration(identifier, options);
        
    }
}
