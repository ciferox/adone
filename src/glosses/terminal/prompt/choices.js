const { is, vendor: { lodash: _ }, Terminal } = adone;
const assert = require("assert");

/**
 * Choice object
 * Normalize input as choice object
 * @constructor
 * @param {String|Object} val  Choice value. If an object is passed, it should contains
 *                             at least one of `value` or `name` property
 */
class Choice {
    constructor(val, answers) {
        // Don't process Choice and Separator object
        if (val instanceof Choice || val.type === "separator") {
            return val;
        }

        if (is.string(val)) {
            this.name = val;
            this.value = val;
            this.short = val;
        } else {
            _.extend(this, val, {
                name: val.name || val.value,
                value: "value" in val ? val.value : val.name,
                short: val.short || val.name || val.value
            });
        }

        if (is.function(val.disabled)) {
            this.disabled = val.disabled(answers);
        } else {
            this.disabled = val.disabled;
        }
    }
}

/**
 * Choices collection
 * Collection of multiple `choice` object
 * @constructor
 * @param {Array} choices  All `choice` to keep in the collection
 */
export default class Choices {
    constructor(terminal, choices, answers) {
        this.terminal = terminal;
        this.choices = choices.map((val) => {
            if (val.type === "separator") {
                if (!(val instanceof Terminal.Separator)) {
                    val = new Terminal.Separator(this.terminal, val.line);
                }
                return val;
            }
            return new Choice(val, answers);
        });

        this.realChoices = this.choices.filter(Terminal.Separator.exclude).filter((item) => {
            return !item.disabled;
        });
    }

    get length() {
        return this.choices.length;
    }

    set length(val) {
        this.choices.length = val;
    }

    get realLength() {
        return this.realChoices.length;
    }

    set realLength(val) {
        throw new Error("Cannot set `realLength` of a Choices collection");
    }

    /**
     * Get a valid choice from the collection
     * @param  {Number} selector  The selected choice index
     * @return {Choice|Undefined} Return the matched choice or undefined
     */
    getChoice(selector) {
        assert(is.number(selector));
        return this.realChoices[selector];
    }

    /**
     * Get a raw element from the collection
     * @param  {Number} selector  The selected index value
     * @return {Choice|Undefined} Return the matched choice or undefined
     */
    get(selector) {
        assert(is.number(selector));
        return this.choices[selector];
    }

    /**
     * Match the valid choices against a where clause
     * @param  {Object} whereClause Lodash `where` clause
     * @return {Array}              Matching choices or empty array
     */
    where(whereClause) {
        return _.filter(this.realChoices, whereClause);
    }

    /**
     * Pluck a particular key from the choices
     * @param  {String} propertyName Property name to select
     * @return {Array}               Selected properties
     */
    pluck(propertyName) {
        return _.map(this.realChoices, propertyName);
    }

    // Expose usual Array methods
    indexOf() {
        return this.choices.indexOf.apply(this.choices, arguments);
    }

    forEach() {
        return this.choices.forEach.apply(this.choices, arguments);
    }

    filter() {
        return this.choices.filter.apply(this.choices, arguments);
    }

    find(func) {
        return _.find(this.choices, func);
    }

    push() {
        const objs = _.map(arguments, (val) => {
            return new Choice(val);
        });
        this.choices.push.apply(this.choices, objs);
        this.realChoices = this.choices.filter(Terminal.Separator.exclude);
        return this.choices;
    }
}

Choices.Choice = Choice;
