function withContext(ComposedComponent) {
    var _class, _temp;

    return _temp = _class = class WithContext extends Component {}, Object.defineProperty(_class, "propTypes", {
        enumerable: true,
        writable: true,
        value: {
            context: PropTypes.shape({
                addCss: PropTypes.func,
                setTitle: PropTypes.func,
                setMeta: PropTypes.func
            })
        }
    }), _temp;
}
