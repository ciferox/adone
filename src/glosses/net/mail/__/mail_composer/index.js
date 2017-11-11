const { is, util, net: { mail: { __ } } } = adone;

/**
 * Creates the object for composing a MimeNode instance out from the mail options
 */
export default class MailComposer {
    constructor(mail = {}) {
        this.mail = mail;
        this.message = false;
    }

    /**
     * Builds MimeNode instance
     */
    compile() {
        this._alternatives = this.getAlternatives();
        this._htmlNode = this._alternatives.filter((alternative) => /^text\/html\b/i.test(alternative.contentType)).pop();
        this._attachments = this.getAttachments(Boolean(this._htmlNode));

        this._useRelated = Boolean(this._htmlNode && this._attachments.related.length);
        this._useAlternative = this._alternatives.length > 1;
        this._useMixed = this._attachments.attached.length > 1 ||
            (this._alternatives.length && this._attachments.attached.length === 1);

        // Compose MIME tree
        if (this.mail.raw) {
            this.message = new __.MimeNode().setRaw(this.mail.raw);
        } else if (this._useMixed) {
            this.message = this._createMixed();
        } else if (this._useAlternative) {
            this.message = this._createAlternative();
        } else if (this._useRelated) {
            this.message = this._createRelated();
        } else {
            let element;
            if (this._alternatives) {
                if (is.array(this._alternatives) && this._alternatives.length) {
                    element = this._alternatives[0];
                } else {
                    element = this._alternatives;
                }
            } else if (this._attachments.attached) {
                if (is.array(this._attachments.attached) && this._attachments.attached.length) {
                    element = this._attachments.attached[0];
                } else {
                    element = this._attachments.attached;
                }
            } else {
                element = {
                    contentType: "text/plain",
                    content: ""
                };
            }
            this.message = this._createContentNode(false, element);
        }

        // Add custom headers
        if (this.mail.headers) {
            this.message.addHeader(this.mail.headers);
        }

        // Add headers to the root node, always overrides custom headers
        for (const header of [
            "from",
            "sender",
            "to",
            "cc",
            "bcc",
            "reply-to",
            "in-reply-to",
            "references",
            "subject",
            "message-id",
            "date"
        ]) {
            const key = header.replace(/-(\w)/g, (o, c) => c.toUpperCase());
            if (this.mail[key]) {
                this.message.setHeader(header, this.mail[key]);
            }
        }

        // Sets custom envelope
        if (this.mail.envelope) {
            this.message.setEnvelope(this.mail.envelope);
        }

        // ensure Message-Id value
        this.message.messageId();

        return this.message;
    }

    /**
     * List all attachments. Resulting attachment objects can be used as input for MimeNode nodes
     */
    getAttachments(findRelated) {
        const attachments = util.arrify(this.mail.attachments || []).map((attachment, i) => {
            const isMessageNode = /^message\//i.test(attachment.contentType);

            if (/^data:/i.test(attachment.path || attachment.href)) {
                attachment = this._processDataUrl(attachment);
            }

            const data = {
                contentType: attachment.contentType ||
                __.mimeFuncs.detectMimeType(attachment.filename || attachment.path || attachment.href || "bin"),
                contentDisposition: attachment.contentDisposition || (isMessageNode ? "inline" : "attachment"),
                contentTransferEncoding: "contentTransferEncoding" in attachment ? attachment.contentTransferEncoding : "base64"
            };

            if (attachment.filename) {
                data.filename = attachment.filename;
            } else if (!isMessageNode && attachment.filename !== false) {
                data.filename = (attachment.path || attachment.href || "")
                    .split("/")
                    .pop()
                    .split("?")
                    .shift() || `attachment-${i + 1}`;
                if (!data.filename.includes(".")) {
                    data.filename += `.${__.mimeFuncs.detectExtension(data.contentType)}`;
                }
            }

            if (/^https?:\/\//i.test(attachment.path)) {
                attachment.href = attachment.path;
                attachment.path = undefined;
            }

            if (attachment.cid) {
                data.cid = attachment.cid;
            }

            if (attachment.raw) {
                data.raw = attachment.raw;
            } else if (attachment.path) {
                data.content = {
                    path: attachment.path
                };
            } else if (attachment.href) {
                data.content = {
                    href: attachment.href
                };
            } else {
                data.content = attachment.content || "";
            }

            if (attachment.encoding) {
                data.encoding = attachment.encoding;
            }

            if (attachment.headers) {
                data.headers = attachment.headers;
            }

            return data;
        });

        let eventObject;

        if (this.mail.icalEvent) {
            let icalEvent;

            if (
                is.object(this.mail.icalEvent) &&
                (
                    this.mail.icalEvent.content ||
                    this.mail.icalEvent.path ||
                    this.mail.icalEvent.href ||
                    this.mail.icalEvent.raw
                )
            ) {
                icalEvent = this.mail.icalEvent;
            } else {
                icalEvent = {
                    content: this.mail.icalEvent
                };
            }

            eventObject = Object.assign({}, icalEvent);

            eventObject.contentType = "application/ics";
            if (!eventObject.headers) {
                eventObject.headers = {};
            }
            eventObject.filename = eventObject.filename || "invite.ics";
            eventObject.headers["Content-Disposition"] = "attachment";
            eventObject.headers["Content-Transfer-Encoding"] = "base64";
        }

        if (!findRelated) {
            return {
                attached: attachments.concat(eventObject || []),
                related: []
            };
        }
        return {
            attached: attachments.filter((attachment) => !attachment.cid).concat(eventObject || []),
            related: attachments.filter((attachment) => Boolean(attachment.cid))
        };

    }

    /**
     * List alternatives. Resulting objects can be used as input for MimeNode nodes
     */
    getAlternatives() {
        let text;

        if (this.mail.text) {
            if (
                is.object(this.mail.text) &&
                (
                    this.mail.text.content ||
                    this.mail.text.path ||
                    this.mail.text.href ||
                    this.mail.text.raw
                )
            ) {
                text = this.mail.text;
            } else {
                text = {
                    content: this.mail.text
                };
            }
            text.contentType = `text/plain${!text.encoding && __.mimeFuncs.isPlainText(text.content) ? "" : "; charset=utf-8"}`;
        }

        let watchHtml;

        if (this.mail.watchHtml) {
            if (
                is.object(this.mail.watchHtml) &&
                (
                    this.mail.watchHtml.content ||
                    this.mail.watchHtml.path ||
                    this.mail.watchHtml.href ||
                    this.mail.watchHtml.raw
                )
            ) {
                watchHtml = this.mail.watchHtml;
            } else {
                watchHtml = {
                    content: this.mail.watchHtml
                };
            }
            watchHtml.contentType = `text/watch-html${!watchHtml.encoding && __.mimeFuncs.isPlainText(watchHtml.content) ? "" : "; charset=utf-8"}`;
        }


        // only include the calendar alternative if there are no attachments
        // otherwise you might end up in a blank screen on some clients
        let icalEvent;
        let eventObject;
        if (this.mail.icalEvent && !(this.mail.attachments && this.mail.attachments.length)) {
            if (
                is.object(this.mail.icalEvent) &&
                (
                    this.mail.icalEvent.content ||
                    this.mail.icalEvent.path ||
                    this.mail.icalEvent.href ||
                    this.mail.icalEvent.raw
                )
            ) {
                icalEvent = this.mail.icalEvent;
            } else {
                icalEvent = {
                    content: this.mail.icalEvent
                };
            }

            eventObject = Object.assign({}, icalEvent);

            if (eventObject.content && is.object(eventObject.content)) {
                // we are going to have the same attachment twice, so mark this to be
                // resolved just once
                eventObject.content._resolve = true;
            }

            eventObject.filename = false;
            eventObject.contentType = `text/calendar; charset="utf-8"; method=${
                (eventObject.method || "PUBLISH")
                    .toString()
                    .trim()
                    .toUpperCase()
            }`;
            if (!eventObject.headers) {
                eventObject.headers = {};
            }
        }

        let html;

        if (this.mail.html) {
            if (
                is.object(this.mail.html) &&
                (
                    this.mail.html.content ||
                    this.mail.html.path ||
                    this.mail.html.href ||
                    this.mail.html.raw
                )
            ) {
                html = this.mail.html;
            } else {
                html = {
                    content: this.mail.html
                };
            }
            html.contentType = `text/html${!html.encoding && __.mimeFuncs.isPlainText(html.content) ? "" : "; charset=utf-8"}`;
        }

        return [
            ...util.arrify(text || []),
            ...util.arrify(watchHtml || []),
            ...util.arrify(html || []),
            ...util.arrify(eventObject || []),
            ...util.arrify(this.mail.alternatives || [])
        ].map((alternative) => {
            if (/^data:/i.test(alternative.path || alternative.href)) {
                alternative = this._processDataUrl(alternative);
            }

            const data = {
                contentType: alternative.contentType ||
                __.mimeFuncs.detectMimeType(alternative.filename || alternative.path || alternative.href || "txt"),
                contentTransferEncoding: alternative.contentTransferEncoding
            };

            if (alternative.filename) {
                data.filename = alternative.filename;
            }

            if (/^https?:\/\//i.test(alternative.path)) {
                alternative.href = alternative.path;
                alternative.path = undefined;
            }

            if (alternative.raw) {
                data.raw = alternative.raw;
            } else if (alternative.path) {
                data.content = {
                    path: alternative.path
                };
            } else if (alternative.href) {
                data.content = {
                    href: alternative.href
                };
            } else {
                data.content = alternative.content || "";
            }

            if (alternative.encoding) {
                data.encoding = alternative.encoding;
            }

            if (alternative.headers) {
                data.headers = alternative.headers;
            }
            return data;
        });
    }

    /**
     * Builds multipart/mixed node. It should always contain different type of elements on the same level
     * eg. text + attachments
     */
    _createMixed(parentNode) {
        let node;

        if (!parentNode) {
            node = new __.MimeNode("multipart/mixed", {
                baseBoundary: this.mail.baseBoundary,
                textEncoding: this.mail.textEncoding,
                boundaryPrefix: this.mail.boundaryPrefix,
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        } else {
            node = parentNode.createChild("multipart/mixed", {
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        }

        if (this._useAlternative) {
            this._createAlternative(node);
        } else if (this._useRelated) {
            this._createRelated(node);
        }

        const create = (element) => {
            // if the element is a html node from related subpart then ignore it
            if (!this._useRelated || element !== this._htmlNode) {
                this._createContentNode(node, element);
            }
        };

        if (!this._useAlternative && this._alternatives) {
            util.arrify(this._alternatives).forEach(create);
        }

        if (this._attachments.attached) {
            util.arrify(this._attachments.attached).forEach(create);
        }

        return node;
    }

    /**
     * Builds multipart/alternative node. It should always contain same type of elements on the same level
     * eg. text + html view of the same data
     */
    _createAlternative(parentNode) {
        let node;

        if (!parentNode) {
            node = new __.MimeNode("multipart/alternative", {
                baseBoundary: this.mail.baseBoundary,
                textEncoding: this.mail.textEncoding,
                boundaryPrefix: this.mail.boundaryPrefix,
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        } else {
            node = parentNode.createChild("multipart/alternative", {
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        }

        for (const alternative of this._alternatives) {
            if (this._useRelated && this._htmlNode === alternative) {
                this._createRelated(node);
            } else {
                this._createContentNode(node, alternative);
            }
        }

        return node;
    }

    /**
     * Builds multipart/related node. It should always contain html node with related attachments
     */
    _createRelated(parentNode) {
        let node;

        if (!parentNode) {
            node = new __.MimeNode('multipart/related; type="text/html"', {
                baseBoundary: this.mail.baseBoundary,
                textEncoding: this.mail.textEncoding,
                boundaryPrefix: this.mail.boundaryPrefix,
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        } else {
            node = parentNode.createChild('multipart/related; type="text/html"', {
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        }

        this._createContentNode(node, this._htmlNode);

        for (const alternative of this._attachments.related) {
            this._createContentNode(node, alternative);
        }

        return node;
    }

    /**
     * Creates a regular node with contents
     */
    _createContentNode(parentNode, element = {}) {
        element.content = element.content || "";

        let node;
        const encoding = (element.encoding || "utf8")
            .toString()
            .toLowerCase()
            .replace(/[-_\s]/g, "");

        if (!parentNode) {
            node = new __.MimeNode(element.contentType, {
                filename: element.filename,
                baseBoundary: this.mail.baseBoundary,
                textEncoding: this.mail.textEncoding,
                boundaryPrefix: this.mail.boundaryPrefix,
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        } else {
            node = parentNode.createChild(element.contentType, {
                filename: element.filename,
                disableUrlAccess: this.mail.disableUrlAccess,
                disableFileAccess: this.mail.disableFileAccess
            });
        }

        // add custom headers
        if (element.headers) {
            node.addHeader(element.headers);
        }

        if (element.cid) {
            node.setHeader("Content-Id", `<${element.cid.replace(/[<>]/g, "")}>`);
        }

        if (element.contentTransferEncoding) {
            node.setHeader("Content-Transfer-Encoding", element.contentTransferEncoding);
        } else if (this.mail.encoding && /^text\//i.test(element.contentType)) {
            node.setHeader("Content-Transfer-Encoding", this.mail.encoding);
        }

        if (!/^text\//i.test(element.contentType) || element.contentDisposition) {
            node.setHeader("Content-Disposition", element.contentDisposition || (element.cid ? "inline" : "attachment"));
        }

        if (is.string(element.content) && !["utf8", "usascii", "ascii"].includes(encoding)) {
            element.content = Buffer.from(element.content, encoding);
        }

        // prefer pregenerated raw content
        if (element.raw) {
            node.setRaw(element.raw);
        } else {
            node.setContent(element.content);
        }

        return node;
    }

    /**
     * Parses data uri and converts it to a Buffer
     */
    _processDataUrl(element) {
        const parts = (element.path || element.href).match(/^data:((?:[^;]*;)*(?:[^,]*)),(.*)$/i);
        if (!parts) {
            return element;
        }

        element.content = /\bbase64$/i.test(parts[1]) ? Buffer.from(parts[2], "base64") : Buffer.from(decodeURIComponent(parts[2]));

        if ("path" in element) {
            element.path = false;
        }

        if ("href" in element) {
            element.href = false;
        }

        for (const item of parts[1].split(";")) {
            if (/^\w+\/[^/]+$/i.test(item)) {
                element.contentType = element.contentType || item.toLowerCase();
            }
        }

        return element;
    }
}
