
import { expect } from 'chai';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildBugFilter } = require('../controllers/bugController.js');

describe('BTSG-19: report filter logic', function () {
    it('filters by status, severity and priority', function () {
        const filter = buildBugFilter(
            {
                status: 'Resolved',
                severity: 'High',
                priority: 'P1',
            },
            'user-123'
        );

        expect(filter).to.deep.equal({
            status: 'Resolved',
            severity: 'High',
            priority: 'P1',
        });
    });

    it('filters assignedToMe using the authenticated user ID', function () {
        const filter = buildBugFilter(
            { assignedToMe: 'true' },
            'user-123'
        );

        expect(filter).to.deep.equal({
            assignee: 'user-123',
        });
    });

    it('returns an empty filter when no filters are selected', function () {
        expect(buildBugFilter({}, 'user-123')).to.deep.equal({});
    });
});
