
const is = adone.is; 

export default class Multi extends adone.terminal.ui.widget.Element {
    constructor(options) {
        super(options);
        this._activePage = null;
        this._pageMap = new Map();
    }

    addPage(widget, index = Number.MAX_SAFE_INTEGER) {
        this.insert(widget, index);
        if (!widget.id) {
            throw new adone.error.NotValidException("cannot add widget with empty id");
        }
        this._pageMap.set(widget.id, widget);
        if (is.null(this._activePage)) {
            this._activePage = widget;
            widget.show();
        }
    }

    removePage(id) {
        const widget = this._pageMap.get(id);
        if (is.undefined(widget)) {
            return false;
        } 
        let index = this.children.indexOf(widget);
        if (this._activeId === id) {
            if (this.children.length > 0) {
                if (index >= this.children.length) {
                    index = this.children.length - 1; 
                }
                this.setActiveWidget(this.children[index].id);
            }
        }
        this.remove(widget);
        this._widgets.delete(id);
        return true;
        
    }

    setActivePage(id) {
        const widget = this._pageMap.get(id);
        if (is.undefined(widget)) {
            return false;
        } 
        if (this._activePage === widget) {
            return true; 
        }
        this._activePage.hide();
        this._activePage = widget;
        widget.show();
        
    }

    getActivePage() {
        return this._activePage;
    }
}
Multi.prototype.type = "multipage";
