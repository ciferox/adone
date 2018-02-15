import { NodeBase } from "./shared/Node";
export default class ClassBody extends NodeBase {
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length > 0) {
            return true;
        }
        return (this.classConstructor &&
            this.classConstructor.hasEffectsWhenCalledAtPath([], callOptions, options));
    }

    initialiseNode() {
        this.classConstructor = this.body.find((method) => method.kind === "constructor");
    }
}
