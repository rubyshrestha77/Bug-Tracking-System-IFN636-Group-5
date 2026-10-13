
const isSameUser = (reference, actor) =>
    !!reference && reference.toString() === actor.id.toString();

const ACTOR_RULES = {
    'Assigned':    (actor, bug) => actor.role === 'developer',
    'In Progress': (actor, bug) => isSameUser(bug.assignee, actor),
    'Resolved':    (actor, bug) => isSameUser(bug.assignee, actor),
    'Closed':      (actor, bug) => isSameUser(bug.reporter, actor),
    'Reopened':    (actor, bug) => isSameUser(bug.reporter, actor),
    'Deleted':     (actor, bug) => isSameUser(bug.reporter, actor)
};

const PERMISSION_MESSAGES = {
    'Assigned':    'Only a developer can assign this bug',
    'In Progress': 'Only the assigned developer can start work on this bug',
    'Resolved':    'Only the assigned developer can resolve this bug',
    'Closed':      'Only the reporter who raised this bug can verify it',
    'Reopened':    'Only the reporter who raised this bug can reopen it',
    'Deleted':     'Only the reporter who raised this bug can delete it'
};

class BugState {
    constructor(status) {
        this.status = status;
    }

    allowsTransitionTo(targetStatus) {
        return false;
    }

    isAuthorisedFor(targetStatus, actor, bug) {
        const rule = ACTOR_RULES[targetStatus];
        return rule ? rule(actor, bug) : false;
    }

    permissionMessage(targetStatus) {
        return PERMISSION_MESSAGES[targetStatus]
            || 'You are not permitted to perform this action on this bug';
    }

    refusalMessage(targetStatus) {
        return `A bug with status ${this.status} cannot be moved to ${targetStatus}`;
    }
}

module.exports = { BugState, isSameUser };