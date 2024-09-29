/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const StateList = require('../ledger-api/statelist');
const Variable = require('./variable');

/**
 * Manages a collection of variables
 */
class VariableList extends StateList {
    constructor(ctx) {
        super(ctx, 'variablelist');
        this.cache = new Map();
    }

    /**
     *
     * @param {Variable} variable
     *
     * @returns {Promise<void>}
     */
    async addVariable(variable) {
        await this.addState(variable);
        this.cache.set(variable.getName(), variable);
    }

    /**
     *
     * @param {Variable} variable
     * @returns {Promise<void>}
     */
    async updateVariable(variable) {
        await this.updateState(variable);
        this.cache.set(variable.getName(), variable);
    }

    async getVariable(variableName) {
        if (this.cache.has(variableName)) {
            return this.cache.get(variableName);
        }

        let key = Variable.makeKey([variableName]);
        let result = await this.getState(key);

        return result ? Variable.fromBuffer(result) : null;
    }

    /**
     *
     * @returns {Promise<Array<Variable>>}
     */
    async getAllVariables() {
        let variables = await this.getAll();
        return variables.map(v => Variable.deserialize(v));
    }
}

module.exports = VariableList;