const { expect } = require('chai');
const { buildBugFilter } = require('../controllers/bugController');

describe('BTSG-19: report filter logic', () => {

  it('should filter by status, severity and priority', () => {
    const filter = buildBugFilter(
      { status: 'Resolved', severity: 'Major', priority: 'High' },
      'user-123'
    );

    expect(filter).to.deep.equal({ status: 'Resolved', severity: 'Major', priority: 'High' });
  });

  it('should filter assignedToMe using the authenticated user ID', () => {
    const filter = buildBugFilter({ assignedToMe: 'true' }, 'user-123');

    expect(filter).to.deep.equal({ assignee: 'user-123' });
  });

  it('should not filter by assignee when assignedToMe is not "true"', () => {
    expect(buildBugFilter({ assignedToMe: 'false' }, 'user-123')).to.deep.equal({});
  });

  it('should return an empty filter when no filters are selected', () => {
    expect(buildBugFilter({}, 'user-123')).to.deep.equal({});
  });

  it('should combine several filters at once', () => {
    const filter = buildBugFilter({ status: 'New', assignedToMe: 'true' }, 'user-123');

    expect(filter).to.deep.equal({ status: 'New', assignee: 'user-123' });
  });
});
