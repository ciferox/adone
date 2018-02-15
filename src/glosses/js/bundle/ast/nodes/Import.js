import { NodeBase } from "./shared/Node";
import NamespaceVariable from "../variables/NamespaceVariable";
export default class Import extends NodeBase {
    setResolution(resolution, interop) {
        this.resolution = resolution;
        this.resolutionInterop = interop;
    }

    render(code, options) {
        // if we have the module in the chunk, inline as Promise.resolve(namespace)
        let resolution;
        if (this.resolution instanceof NamespaceVariable) {
            // ideally this should be handled like normal tree shaking
            this.resolution.includeVariable();
            code.overwrite(this.parent.start, this.parent.arguments[0].start, "Promise.resolve().then(function () { return ");
            code.overwrite(this.parent.arguments[0].start, this.parent.arguments[0].end, this.resolution.getName());
            code.overwrite(this.parent.arguments[0].end, this.parent.end, "; })");
        } else if (this.resolution) {
            resolution = this.resolution;
            if (options.importMechanism) {
                const leftMechanism = this.resolutionInterop && options.importMechanism.interopLeft || options.importMechanism.left;
                code.overwrite(this.parent.start, this.parent.arguments[0].start, leftMechanism);
            }
            if (resolution) {
                code.overwrite(this.parent.arguments[0].start, this.parent.arguments[0].end, resolution);
            }
            if (options.importMechanism) {
                const rightMechanism = this.resolutionInterop && options.importMechanism.interopRight || options.importMechanism.right;
                code.overwrite(this.parent.arguments[0].end, this.parent.end, rightMechanism);
            }
        }
    }
}
