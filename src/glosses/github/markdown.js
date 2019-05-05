import Requestable from "./requestable";

/**
 * Renders html from Markdown text
 */
export default class Markdown extends Requestable {
    /**
     * Render html from Markdown text.
     * @see https://developer.github.com/v3/markdown/#render-an-arbitrary-markdown-document
     * @param {Object} options - conversion options
     * @param {string} [options.text] - the markdown text to convert
     * @param {string} [options.mode=markdown] - can be either `markdown` or `gfm`
     * @param {string} [options.context] - repository name if mode is gfm
     * @param {Requestable.callback} [cb] - will receive the converted html
     * @return {Promise} - the promise for the http request
     */
    render(options, cb) {
        return this._request("POST", "/markdown", options, cb, true);
    }
}
