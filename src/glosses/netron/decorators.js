const { reflect } = adone.meta;

// Применим к методам и свойствам класса. Указывает на то, что класс, метод или свойство является закрытым.
export const Private = reflect.metadata("meta:private", true);

// Применим к классам, методам и свойствам. Указывает не то, что класс, метод или свойство являются открытым. 
export const Public = reflect.metadata("meta:private", false);

// Применим к свойствам класса. Указывает на доступность только для чтения.
export const Readonly = reflect.metadata("meta:readonly", true);

// Применим к классам. Указывает на то, что объекты данного класса в netron-е всегда обрабатываются как контексты.
// При возвращении объекта класса с таким свойством будет создан слабый контекст и вместо самого объекта будет передано его определение (definition).
// При передаче такого объекта в качестве аргумента также будет создан слабый контекст и вместо объекта будет передана ссылка (reference).
export const Contextable = reflect.metadata("meta:contextable", true);


// Validate super class for twin interface. Allowed super class expressions:
// - 'Interface'
// - 'netron.Interface'
// - 'adone.netron.Interface'
function validateSuperClass(ast) {
    const sc = ast.superClass;
    if (adone.is.nil(sc)) {
        return false;
    }
     
    if (sc.type === "Identifier" && sc.name === "Interface") {
        return true;
    }
    

    if (sc.type === "MemberExpression") {
        if (sc.object.type === "Identifier" && sc.object.name === "netron" && sc.property.type === "Identifier" && sc.property.name === "Interface") {
            return true;
        }

        if (sc.object.type === "MemberExpression" &&
            sc.object.object.type === "Identifier" && sc.object.object.name === "adone" &&
            sc.object.property.type === "Identifier" && sc.object.property.name === "netron" &&
            sc.property.type === "Identifier" && sc.property.name === "Interface") {
            return true;
        }
    }

    return false;
}

// Class only decorator used for associate implementation of a twin interface with context.
export function Twin(obj) {
    if (adone.is.class(obj)) {
        obj = obj.toString();
    } else if (!adone.is.string(obj)) {
        throw new adone.x.NotValid("Not valid twin interface");
    }

    const ast = adone.js.compiler.parse(obj, {
        sourceType: "script"
    });

    let twinCode = "";
    adone.js.compiler.traverse(ast, {
        ClassDeclaration: (path) => {
            if (!validateSuperClass(path.node)) {
                throw new adone.x.NotValid("Twin interface should extend 'adone.netron.Interface' class");
            }

            // there is a sense to verify the code more thoroughly...

            twinCode = adone.js.compiler.generate(path.node, {
                comments: false
            }).code;
        }
    });
    
    return reflect.metadata("meta:twin", twinCode);
}

// Применим к методам класса. Перечисляет аргументы метода. Возможны следующие варианты определения:
// 1. Type
// 2. "argName"
// 3. [Type]
// 4. ["argName"]
// 5. [Type, "argName"]
export function Args(...args) {
    return reflect.metadata("meta:args", args);
}

// Добавляет описание к классу, методу или свойству.
export function Description(info) {
    return reflect.metadata("meta:description", info);
}

// Указывает на тип свойства или тип возвращаемого значения метода.
export function Type(type) {
    return reflect.metadata("meta:type", type);
}

// Применим к классу для описания недоступного свойства или свойства, которое нет возможности описать декларативно.
export function Property(name, descr) {
    return reflect.metadata(`meta:property:${name}`, descr);
}

// Примени к классу для описания недоступного метода или метода, который нет возможности описать декларативно.
export function Method(name, descr) {
    return reflect.metadata(`meta:method:${name}`, descr);
}
