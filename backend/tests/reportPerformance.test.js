const { expect } = require('chai');
const sinon = require('sinon');
const CSVReportGenerator = require('../domain/reports/CSVReportGenerator');
const JSONReportGenerator = require('../domain/reports/JSONReportGenerator');

// 500 valid bugs (severity and priority use the values the Bug model allows)
const createSampleBugs = () =>
  Array.from({ length: 500 }, (_, i) => ({
    _id: `bug-${i + 1}`,
    title: `Sample bug ${i + 1}`,
    description: `Description for sample bug ${i + 1}`,
    stepsToReproduce: 'Open the application, then click Save.',
    severity: 'Minor',
    priority: 'Medium',
    status: 'Resolved',
    reporter: { name: 'Test Reporter' },
    assignee: { name: 'Test Assignee' },
    resolutionNote: 'Fixed',
    reopenReason: '',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    resolvedAt: new Date('2026-01-02T00:00:00Z'),
    verifiedAt: null,
  }));

describe('BTSG-68: export performance', function () {
  this.timeout(5000);

  afterEach(() => sinon.restore());

  it('should generate a valid CSV for 500 bugs in under 3 seconds', () => {
    const bugs = createSampleBugs();
    const generator = new CSVReportGenerator();
    const generateSpy = sinon.spy(generator, 'generateReport');

    const start = Date.now();
    const csv = generator.generateReport(bugs);
    const elapsedMs = Date.now() - start;

    expect(generateSpy.calledOnce).to.be.true;
    expect(csv.split('\r\n')).to.have.lengthOf(501); // header + 500 rows
    expect(csv).to.include('Sample bug 500');
    expect(elapsedMs).to.be.below(3000);
  });

  it('should generate valid JSON for 500 bugs in under 3 seconds', () => {
    const bugs = createSampleBugs();
    const generator = new JSONReportGenerator();

    const start = Date.now();
    const json = generator.generateReport(bugs);
    const elapsedMs = Date.now() - start;

    const parsed = JSON.parse(json);
    expect(parsed).to.have.lengthOf(500);
    expect(parsed[0].title).to.equal('Sample bug 1');
    expect(parsed[499].title).to.equal('Sample bug 500');
    expect(elapsedMs).to.be.below(3000);
  });
});
