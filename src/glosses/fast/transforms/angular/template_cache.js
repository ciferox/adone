// @flow



const { fast: { Fast }, vendor: { lodash: _ }, is, std: { path }, util } = adone;

/**
 * "constants"
 */

const TEMPLATE_HEADER = "angular.module('<%= module %>'<%= standalone %>).run(['$templateCache', function($templateCache) {";
const TEMPLATE_BODY = "$templateCache.put('<%= url %>','<%= contents %>');";
const TEMPLATE_FOOTER = "}]);";

const DEFAULT_FILENAME = "templates.js";
const DEFAULT_MODULE = "templates";
const MODULE_TEMPLATES = {
    requirejs: "define(['angular'], function(angular) { 'use strict'; return <%= file.contents %>});",
    browserify: "'use strict'; module.exports = <%= file.contents %>",
    es6: "import angular from 'angular'; export default <%= file.contents %>",
    iife: "(function(){ <%= file.contents %> })();"
};

/**
 * Add files to templateCache.
 */

const processed = Symbol("processed");

/**
 * templateCache a stream of files.
 */

function templateCacheStream(root, base, templateBody, transformUrl) {

    /**
     * Set relative base
     */

    if (typeof base !== "function" && base && base.substr(-1) !== path.sep) {
        base += path.sep;
    }

    const template = _.template(templateBody || TEMPLATE_BODY);


    return new Fast(null, {
        transform(file) {
            if (file[processed]) {
                this.push(file);
                return;
            }
            let url;

            file.path = path.normalize(file.path);

            /**
             * Rewrite url
             */

            if (is.function(base)) {
                url = path.join(root, base(file));
            } else {
                url = path.join(root, file.path.replace(base || file.base, ""));
            }

            if (root === "." || root.indexOf("./") === 0) {
                url = `./${url}`;
            }

            if (is.function(transformUrl)) {
                url = transformUrl(url);
            }

            url = util.unixifyPath(url);
            /**
             * Create buffer
             */
            file.contents = new Buffer(template({
                url,
                contents: util.jsesc(file.contents.toString()),
                file
            }));

            file[processed] = true;

            this.push(file);

        }
    });
}

/**
 * Concatenates and registers AngularJS templates in the $templateCache.
 *
 * @param {string} [filename='templates.js']
 * @param {object} [options]
 */

export default function angularTemplateCache(filename, options = {}) {
    if (!is.string(filename)) {
        options = filename || {};
        filename = options.filename || DEFAULT_FILENAME;
    }

    const templateHeader = options.templateHeader || TEMPLATE_HEADER;
    const templateFooter = options.templateFooter || TEMPLATE_FOOTER;
    const stream = templateCacheStream(options.root || "", options.base, options.templateBody, options.transformUrl)
        .concat(filename)
        .wrap(`${templateHeader}<%= file.contents %>`, {
            module: options.module || DEFAULT_MODULE,
            standalone: options.standalone ? ", []" : ""
        })
        .wrap(`<%= file.contents %>${templateFooter}`, {
            module: options.module || DEFAULT_MODULE
        });
    if (options.moduleSystem) {
        const moduleTemplate = MODULE_TEMPLATES[options.moduleSystem.toLowerCase()];
        stream.wrap(moduleTemplate);
    }
    return stream;
}
