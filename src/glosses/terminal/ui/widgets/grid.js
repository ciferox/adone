
const is = adone.is;

class DefaultWidget extends adone.terminal.ui.widget.Element {
    constructor(options) {
        super(options);
    }
}

export default class Grid extends adone.terminal.ui.widget.Element {
    constructor(options = { }) {
        if ((options.width == null && (options.left == null && options.right == null)) || (options.height == null && (options.top == null && options.bottom == null))) {
            options.top = 0;
            options.left = 0;
            options.right = 0;
            options.bottom = 0;
        }
        super(options);

        this._widgetMap = new Map();
        this._dockMap = new Map();

        // default layout
        this.setLayout({
            grid: { cols: 12, rows: 12 }, content: { rows: [{ }] }
        });
    }

    setLayout(layout) {
        this._layout = layout;
        this._dockMap.clear();
        this._cellWidth = (100 / layout.grid.cols);
        this._cellHeight = (100 / layout.grid.rows);

        this._calculatePos(layout.content, 0, 0, 0, layout.grid.cols, layout.grid.rows);

        // Process default widgets
        if (is.object(this.options.defaultWidget)) {
            for (const dockId of this._dockMap.keys()) {
                const widget = this._widgetMap.get(dockId); 
                if (is.undefined(widget)) {
                    this.setWidget(new DefaultWidget(this.options.defaultWidget), dockId);
                }
            }
        }
    }

    /**
     * Проверяет является ли dockId действительным для текущей сетки. 
     * 
     * @returns true, если dockId действительный
     * 
     * @memberOf Grid
     */
    isValidDockId(dockId) {
        return (dockId >= 0 && dockId < this._dockMap.size);
    }

    setWidget(widget, dockId) {
        if (!this.isValidDockId(dockId)) {
            return; 
        }
        const oldWidget = this._widgetMap.get(dockId);
        if (oldWidget === widget) {
            return; 
        }
        let index = dockId;
        if (!is.undefined(oldWidget)) {
            if (!(oldWidget instanceof DefaultWidget)) {

            }
            index = this.children.indexOf(oldWidget);
            oldWidget.detach();
        }
        this._widgetMap.set(dockId, widget);
        this.insert(widget, index);
    }

    render() {
        const coords = this._getCoords(true);
        const children = this.children;
        this.children = [];
        super.render();
        this.children = children;
        if (!coords) {
            delete this.lpos;
            return;
        }

        if (coords.xl - coords.xi <= 0) {
            coords.xl = Math.max(coords.xl, coords.xi);
            return;
        }

        if (coords.yl - coords.yi <= 0) {
            coords.yl = Math.max(coords.yl, coords.yi);
            return;
        }

        this.lpos = coords;

        if (this.border) {
            coords.xi++;
            coords.xl--;
            coords.yi++;
            coords.yl--;
        }
        if (this.tpadding) {
            coords.xi += this.padding.left;
            coords.xl -= this.padding.right;
            coords.yi += this.padding.top;
            coords.yl -= this.padding.bottom;
        }

        const width = coords.xl - coords.xi;
        const height = coords.yl - coords.yi;

        if (this.border) {
            coords.xi--;
            coords.xl++;
            coords.yi--;
            coords.yl++;
        }
        if (this.tpadding) {
            coords.xi -= this.padding.left;
            coords.xl += this.padding.right;
            coords.yi -= this.padding.top;
            coords.yl += this.padding.bottom;
        }

        this.children.forEach((el, i) => {
            if (el.screen._ci !== -1) {
                el.index = el.screen._ci++;
            }

            if (el.hidden || el._isLabel) {
                return; 
            }

            const dockId = this._getWidgetDockId(el);
            if (is.nil(dockId)) {
                return; 
            }

            const modW = width % 2;
            const modH = height % 2;
            const dockCoords = this._dockMap.get(dockId);
            el.position.left = Math.floor((dockCoords.left * this._cellWidth * width) / 100);
            el.position.top = Math.floor((dockCoords.top * this._cellHeight * height) / 100);
            el.position.width = Math.floor((dockCoords.width * this._cellWidth * width) / 100);
            el.position.height = Math.floor((dockCoords.height * this._cellHeight * height) / 100);
            
            if (modW === 1 && (el.position.left + el.position.width + modW) === width) {
                el.position.width++;
            }

            if (modH === 1 && (el.position.top + el.position.height + modH) === height) {
                el.position.height++;
            }

            el.render();
        });
        return coords;
    }

    _getWidgetDockId(widget) {
        for (const [dockId, dockedWidget] of this._widgetMap.entries()) {
            if (widget === dockedWidget) {
                return dockId; 
            }
        }
        return null;
    }

    _calculatePos(content, dockId, left, top, cols, rows) {
        let items;
        let isRows = false;
        if (content.rows) {
            items = content.rows;
            isRows = true;
        } else if (content.cols) {
            items = content.cols;
        } else {
            throw new adone.x.NotValid("nothing 'cols' or 'rows' specified");
        }

        if (is.propertyDefined(content, "width")) {
            cols = content.width;
        }
        if (is.propertyDefined(content, "height")) {
            rows = content.height;
        }

        const normW = cols / items.length;
        const normH = rows / items.length;

        for (const it of items) {
            if (is.propertyDefined(it, "cols") || is.propertyDefined(it, "rows")) {
                dockId = this._calculatePos(it, dockId, left, top, (isRows ? cols : normW), (!isRows ? rows : normH));
                if (isRows) {
                    top += it.height || normH;
                    rows -= it.height || 0;
                } else {
                    left += it.width || normW;
                    cols -= it.width || 0;
                }
            } else {
                const dock = { left, top };
                if (isRows) {
                    dock.width = cols;
                    dock.height = it.height || normH;
                    top += dock.height;
                    rows -= dock.height;
                } else {
                    dock.width = it.width || normW;
                    dock.height = rows;
                    left += dock.width;
                    cols -= dock.width;
                }
                this._dockMap.set(dockId, dock);
                dockId++;
            }
        }

        return dockId;
    }
}
Grid.prototype.type = "grid";
