const {
    js: { compiler: { types: t } }
} = adone;

const getObjRef = function (node, nodes, file, scope) {
    let ref;
    if (t.isSuper(node)) {
        // Super cannot be directly assigned so lets return it directly
        return node;
    } else if (t.isIdentifier(node)) {
        if (scope.hasBinding(node.name)) {
            // this variable is declared in scope so we can be 100% sure
            // that evaluating it multiple times wont trigger a getter
            // or something else
            return node;
        }
        // could possibly trigger a getter so we need to only evaluate
        // it once
        ref = node;

    } else if (t.isMemberExpression(node)) {
        ref = node.object;

        if (t.isSuper(ref) || (t.isIdentifier(ref) && scope.hasBinding(ref.name))) {
            // the object reference that we need to save is locally declared
            // so as per the previous comment we can be 100% sure evaluating
            // it multiple times will be safe
            // Super cannot be directly assigned so lets return it also
            return ref;
        }
    } else {
        throw new Error(`We can't explode this node type ${node.type}`);
    }

    const temp = scope.generateUidIdentifierBasedOnNode(ref);
    scope.push({ id: temp });
    nodes.push(t.assignmentExpression("=", temp, ref));
    return temp;
};

const getPropRef = function (node, nodes, file, scope) {
    const prop = node.property;
    const key = t.toComputedKey(node, prop);
    if (t.isLiteral(key) && t.isPureish(key)) {
        return key; 
    }

    const temp = scope.generateUidIdentifierBasedOnNode(prop);
    scope.push({ id: temp });
    nodes.push(t.assignmentExpression("=", temp, prop));
    return temp;
};

export default function (
    node: Object,
    nodes: Array<Object>,
    file,
    scope: Scope,
    allowedSingleIdent?: boolean,
): {
        uid: Object,
        ref: Object,
    } {
    let obj;
    if (t.isIdentifier(node) && allowedSingleIdent) {
        obj = node;
    } else {
        obj = getObjRef(node, nodes, file, scope);
    }

    let ref;
    let uid;

    if (t.isIdentifier(node)) {
        ref = node;
        uid = obj;
    } else {
        const prop = getPropRef(node, nodes, file, scope);
        const computed = node.computed || t.isLiteral(prop);
        uid = ref = t.memberExpression(obj, prop, computed);
    }

    return {
        uid,
        ref
    };
}
