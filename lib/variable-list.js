
'use strict';

// Utility class for collections of ledger states --  a state list
const StateList = require('./../ledger-api/statelist.js');
const Variable = require('./variable.js');

class VariableList extends StateList {
    constructor(ctx) {
        super(ctx, 'de.stuttgart.uni.iaas.blockchains.variablelist');
    }

    async addVariable(variable) {
        this.addState(variable);
    }

    async getVariable(varialbeKey) {
        let result = await this.getState(varialbeKey);

        return result? new Variable(result) : null;
    } 

    async updateVariable(variable) {
        this.updateState(variable);
    }
}

module.exports = VariableList;