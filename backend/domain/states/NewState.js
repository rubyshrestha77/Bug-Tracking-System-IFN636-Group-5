const { BugState } = require('./BugState');

class NewState extends BugState {
    constructor() { super('New'); }

    allowsTransitionTo(target) {
        return target === 'Assigned' || target === 'Deleted';
    }
}

module.exports = NewState;