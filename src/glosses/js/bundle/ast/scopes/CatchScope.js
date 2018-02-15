import ParameterScope from "./ParameterScope";
export default class CatchScope extends ParameterScope {
    addDeclaration(identifier, options = {
        isHoisted: false
    }) {
        if (options.isHoisted) {
            return this.parent.addDeclaration(identifier, options);
        }
        
        return super.addDeclaration(identifier, options);
        
    }
}
