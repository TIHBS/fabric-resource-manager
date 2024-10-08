/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const TxDetailsList = require('./tx-details-list');
const VariableList = require('./variable-list');
const { Context } = require('fabric-contract-api');


class ResourceManagerContext extends Context {
    constructor() {
        super();
        this.variableList = new VariableList(this);
        this.TxDetailsList = new TxDetailsList(this);
    }
}

module.exports = ResourceManagerContext;