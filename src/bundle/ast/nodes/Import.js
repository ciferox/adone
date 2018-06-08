import { NodeBase } from './shared/Node';
const getDynamicImportMechanism = (format, compact) => {
    switch (format) {
        case 'cjs': {
            const _ = compact ? '' : ' ';
            return {
                left: 'Promise.resolve(require(',
                right: '))',
                interopLeft: `Promise.resolve({${_}default:${_}require(`,
                interopRight: `)${_}})`
            };
        }
        case 'amd': {
            const _ = compact ? '' : ' ';
            const resolve = compact ? 'c' : 'resolve';
            const reject = compact ? 'e' : 'reject';
            return {
                left: `new Promise(function${_}(${resolve},${_}${reject})${_}{${_}require([`,
                right: `],${_}${resolve},${_}${reject})${_}})`,
                interopLeft: `new Promise(function${_}(${resolve},${_}${reject})${_}{${_}require([`,
                interopRight: `],${_}function${_}(m)${_}{${_}${resolve}({${_}default:${_}m${_}})${_}},${_}${reject})${_}})`
            };
        }
        case 'system':
            return {
                left: 'module.import(',
                right: ')'
            };
    }
};
export default class Import extends NodeBase {
    initialise() {
        this.included = false;
        this.resolutionNamespace = undefined;
        this.resolutionInterop = false;
        this.rendered = false;
        this.context.addDynamicImport(this);
    }
    renderFinalResolution(code, resolution) {
        // avoid unnecessary writes when tree-shaken
        if (this.rendered)
            code.overwrite(this.parent.arguments[0].start, this.parent.arguments[0].end, resolution);
    }
    render(code, options) {
        this.rendered = true;
        if (this.resolutionNamespace) {
            const _ = options.compact ? '' : ' ';
            const s = options.compact ? '' : ';';
            code.overwrite(this.parent.start, this.parent.end, `Promise.resolve().then(function${_}()${_}{${_}return ${this.resolutionNamespace}${s}${_}})`);
            return;
        }
        const importMechanism = getDynamicImportMechanism(options.format, options.compact);
        if (importMechanism) {
            const leftMechanism = (this.resolutionInterop && importMechanism.interopLeft) || importMechanism.left;
            code.overwrite(this.parent.start, this.parent.arguments[0].start, leftMechanism);
            const rightMechanism = (this.resolutionInterop && importMechanism.interopRight) || importMechanism.right;
            code.overwrite(this.parent.arguments[0].end, this.parent.end, rightMechanism);
        }
    }
    setResolution(interop, namespace = undefined) {
        this.rendered = false;
        this.resolutionInterop = interop;
        this.resolutionNamespace = namespace;
    }
}
