/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const TxDetailsList = require('./tx-details-list.js');
const VariableList = require('./variable-list.js');
const { Context } = require('fabric-contract-api');
const {stub} = require("sinon");


class ResourceManagerContext extends Context {
    constructor() {
        super();
        this.variableList = new VariableList(this);
        this.TxDetailsList = new TxDetailsList(this);
        stub.getFunctionAndParameters()
    }
}

module.exports = ResourceManagerContext;