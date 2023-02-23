
'use strict';

// Utility class for collections of ledger states --  a state list
const StateList = require('./../ledger-api/statelist.js');
const Variable = require('./variable.js');

class VariableList extends StateList {
    constructor(ctx) {
        super(ctx, 'variablelist');
    }

    async addVariable(variable) {
        await this.addState(variable);
    }

    async updateVariable(variable) {
        await this.updateState(variable);
    }

    async getVariable(variableName) {
        let key = Variable.makeKey([variableName]);
        let result = await this.getState(key);

        return result? Variable.fromBuffer(result) : null;
    } 
}

module.exports = VariableList;