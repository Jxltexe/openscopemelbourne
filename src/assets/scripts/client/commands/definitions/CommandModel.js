/**
 * A definition of a specific command and it's arguments.
 *
 * Contains a command name, which maps 1:1 with a name defined in `AircraftCommandMap` or `SystemCommandMap`.
 * Commands may have an alias or many, we care only about the root command. The command map will map any
 * alias to a root command and this `CommandModel` is only concerned about those root commands. It has
 * no way of knowing what the original alias was, if one was used.
 *
 * @class CommandModel
 */
export default class CommandModel {
    /**
     * @constructor
     * @for CommandModel
     * @param {string} name
     * @param {object} commandDefinition
     */
    constructor(name = '', commandDefinition) {
        /**
         * command name, should match a command in the COMMANDS constant
         *
         * @property name
         * @type {string}
         */
        this.name = name;

        /**
         * A reference to {AIRCRAFT,SYSTEM}_COMMAND_MAP for this particular command.
         * This gives us access to both the `validate` and `parse` methods that belong to this command.
         *
         * Storing this as an instance property allows us to do the lookup once
         * and then make it available to the rest of the class so it can be referenced when needed.
         *
         * @property _commandDefinition
         * @type {object}
         * @private
         */
        this._commandDefinition = commandDefinition;

        /**
         * list of command arguments
         *
         * - assumed to be the text command names
         * - may be empty, depending on the command
         * - should only ever be strings on initial set immediately after instantiation
         * - will later be parsed via the `_commandDefinition.parse()` method to the
         *   correct data types and shape
         *
         * @property args
         * @type {array}
         * @default []
         */
        this.args = [];

        // TODO: may need to throw here if `_commandDefinition` is undefined
    }

    /**
     * Return an array of [name, ...args]
     *
     * We use this shape solely to match the existing api.
     *
     * @property nameAndArgs
     * @return {array}
     */
    get nameAndArgs() {
        return [
            this.name,
            ...this.args
        ];
    }

    /**
     * Send the initial args off to the validator
     *
     * @for CommandModel
     * @method validateArgs
     * @return {string|undefined}
     */
    validateArgs() {
        if (typeof this._commandDefinition === 'undefined') {
            return;
        }

        return this._commandDefinition.validate(this.args);
    }

    /**
     * Send the initial args, set from the `CommandParser` right after instantiation, off to
     * the parser for formatting.
     *
     * @for CommandModel
     * @method parseArgs
     */
    parseArgs() {
        // this completely overwrites current args. this is intended because all args are received as
        // strings but consumed as strings, numbers or booleans. and when the args are initially set
        // they may not all be available yet
        this.args = this._commandDefinition.parse(this.args);
    }
}
