import { dirname, normalize, relative } from '../../utils/path';
import Identifier from './Identifier';
import Literal from './Literal';
import MemberExpression from './MemberExpression';
import { NodeBase } from './shared/Node';
const globalImportMetaUrlMechanism = `(typeof document !== 'undefined' ? document.currentScript && document.currentScript.src || document.baseURI : new (typeof URL !== 'undefined' ? URL : require('ur'+'l').URL)('file:' + __filename).href)`;
const importMetaUrlMechanisms = {
    amd: `new URL((typeof process !== 'undefined' && process.versions && process.versions.node ? 'file:' : '') + module.uri).href`,
    cjs: `new (typeof URL !== 'undefined' ? URL : require('ur'+'l').URL)((process.browser ? '' : 'file:') + __filename, process.browser && document.baseURI).href`,
    iife: globalImportMetaUrlMechanism,
    umd: globalImportMetaUrlMechanism
};
const globalImportMetaUrlMechanismCompact = `(typeof document!=='undefined'?document.currentScript&&document.currentScript.src||document.baseURI:new(typeof URL!=='undefined'?URL:require('ur'+'l').URL)('file:'+__filename).href)`;
const importMetaUrlMechanismsCompact = {
    amd: `new URL((typeof process!=='undefined'&&process.versions&&process.versions.node?'file:':'')+module.uri).href`,
    cjs: `new(typeof URL!=='undefined'?URL:require('ur'+'l').URL)((process.browser?'':'file:')+__filename,process.browser&&document.baseURI).href`,
    iife: globalImportMetaUrlMechanismCompact,
    umd: globalImportMetaUrlMechanismCompact
};
const globalRelUrlMechanism = (relPath, compact) => {
    const _ = compact ? '' : ' ';
    return `new${_}(typeof URL${_}!==${_}'undefined'${_}?${_}URL${_}:${_}require('ur'+'l').URL)((typeof document${_}!==${_}'undefined'${_}?${_}document.currentScript${_}&&${_}document.currentScript.src${_}||${_}document.baseURI${_}:${_}'file:'${_}+${_}__filename)${_}+${_}'/../${relPath}').href`;
};
const relUrlMechanisms = {
    amd: (relPath, compact) => {
        const _ = compact ? '' : ' ';
        return `new URL((typeof process${_}!==${_}'undefined'${_}&&${_}process.versions${_}&&${_}process.versions.node${_}?${_}'file:'${_}:${_}'')${_}+${_}module.uri${_}+${_}'/../${relPath}').href`;
    },
    cjs: (relPath, compact) => {
        const _ = compact ? '' : ' ';
        return `new${_}(typeof URL${_}!==${_}'undefined'${_}?${_}URL${_}:${_}require('ur'+'l').URL)((process.browser${_}?${_}''${_}:${_}'file:')${_}+${_}__dirname${_}+${_}'/${relPath}',${_}process.browser${_}&&${_}document.baseURI).href`;
    },
    es: (relPath, compact) => {
        const _ = compact ? '' : ' ';
        return `new URL('../${relPath}',${_}import.meta.url).href`;
    },
    system: (relPath, compact) => {
        const _ = compact ? '' : ' ';
        return `new URL('../${relPath}',${_}module.url).href`;
    },
    iife: globalRelUrlMechanism,
    umd: globalRelUrlMechanism
};
export default class MetaProperty extends NodeBase {
    initialise() {
        if (this.meta.name === 'import') {
            this.rendered = false;
            this.context.addImportMeta(this);
        }
        this.included = false;
    }
    render(code, options) {
        if (this.meta.name === 'import')
            this.rendered = true;
        super.render(code, options);
    }
    renderFinalMechanism(code, chunkId, format, compact) {
        if (!this.rendered)
            return false;
        if (this.parent instanceof MemberExpression === false)
            return false;
        const parent = this.parent;
        let importMetaProperty;
        if (parent.property instanceof Identifier)
            importMetaProperty = parent.property.name;
        else if (parent.property instanceof Literal && typeof parent.property.value === 'string')
            importMetaProperty = parent.property.value;
        else
            return false;
        // support import.meta.ROLLUP_ASSET_URL_[ID]
        if (importMetaProperty.startsWith('ROLLUP_ASSET_URL_')) {
            const assetFileName = this.context.getAssetFileName(importMetaProperty.substr(17));
            const relPath = normalize(relative(dirname(chunkId), assetFileName));
            code.overwrite(parent.start, parent.end, relUrlMechanisms[format](relPath, compact));
            return true;
        }
        if (format === 'system') {
            code.overwrite(this.meta.start, this.meta.end, 'module');
        }
        else if (importMetaProperty === 'url') {
            const importMetaUrlMechanism = (compact
                ? importMetaUrlMechanismsCompact
                : importMetaUrlMechanisms)[format];
            if (importMetaUrlMechanism)
                code.overwrite(parent.start, parent.end, importMetaUrlMechanism);
            return true;
        }
        return false;
    }
}
