const { expect } = require('chai');
const sinon = require('sinon');
const ReportGenerator = require('../domain/reports/ReportGenerator');
const CSVReportGenerator = require('../domain/reports/CSVReportGenerator');
const JSONReportGenerator = require('../domain/reports/JSONReportGenerator');
const ReportGeneratorFactory = require('../domain/reports/ReportGeneratorFactory');

const bug = (overrides = {}) => ({
  _id: 'bug-1',
  title: 'Crash on save',
  description: 'App crashes',
  stepsToReproduce: '1. Click save',
  severity: 'Major',
  priority: 'High',
  status: 'Assigned',
  reporter: { name: 'Rita' },
  assignee: { name: 'Dev' },
  ...overrides,
});

describe('ReportGenerator (abstract)', () => {
  it('should not be instantiable directly', () => {
    expect(() => new ReportGenerator()).to.throw('abstract class');
  });

  it('should force subclasses to implement generateReport()', () => {
    class Lazy extends ReportGenerator {}
    expect(() => new Lazy().generateReport([])).to.throw('must be implemented by a subclass');
  });
});

describe('ReportGeneratorFactory', () => {
  it('should create a CSV generator', () => {
    expect(ReportGeneratorFactory.createGenerator('csv')).to.be.instanceOf(CSVReportGenerator);
  });

  it('should create a JSON generator, ignoring case and spaces', () => {
    expect(ReportGeneratorFactory.createGenerator('  JSON ')).to.be.instanceOf(JSONReportGenerator);
  });

  it('should throw for an unsupported format', () => {
    expect(() => ReportGeneratorFactory.createGenerator('pdf')).to.throw('Unsupported report format: pdf');
  });

  [undefined, '', '   ', 42].forEach((value) => {
    it(`should throw when the format is ${JSON.stringify(value)}`, () => {
      expect(() => ReportGeneratorFactory.createGenerator(value)).to.throw('Report format is required');
    });
  });
});

describe('CSVReportGenerator', () => {
  const generator = new CSVReportGenerator();

  it('should throw a TypeError when given something that is not an array', () => {
    expect(() => generator.generateReport('nope')).to.throw(TypeError, 'Bugs must be an array');
  });

  it('should output only the header row for no bugs', () => {
    const csv = generator.generateReport([]);

    expect(csv.split('\r\n')).to.have.lengthOf(1);
    expect(csv.startsWith('id,title,description,stepsToReproduce,severity,priority,status')).to.be.true;
  });

  it('should output one row per bug with reporter and assignee names', () => {
    const rows = generator.generateReport([bug()]).split('\r\n');

    expect(rows).to.have.lengthOf(2);
    expect(rows[1]).to.include('bug-1,Crash on save');
    expect(rows[1]).to.include('Rita,Dev');
  });

  it('should quote values containing commas, quotes or new lines', () => {
    const csv = generator.generateReport([bug({ title: 'Hello, "world"', description: 'line1\nline2' })]);

    expect(csv).to.include('"Hello, ""world"""');
    expect(csv).to.include('"line1\nline2"');
  });

  it('should leave empty cells for null values and a missing assignee', () => {
    const row = generator.generateReport([bug({ assignee: null, priority: null })]).split('\r\n')[1];

    expect(row).to.include(',,'); // empty priority cell and empty assignee cell
  });

  it('should write dates as ISO strings', () => {
    const csv = generator.generateReport([bug({ createdAt: new Date('2026-01-02T03:04:05Z') })]);

    expect(csv).to.include('2026-01-02T03:04:05.000Z');
  });
});

describe('JSONReportGenerator', () => {
  const generator = new JSONReportGenerator();

  it('should throw a TypeError when given something that is not an array', () => {
    expect(() => generator.generateReport({})).to.throw(TypeError, 'Bugs must be an array');
  });

  it('should return an empty JSON array for no bugs', () => {
    expect(JSON.parse(generator.generateReport([]))).to.deep.equal([]);
  });

  it('should map each bug to the report fields', () => {
    const parsed = JSON.parse(generator.generateReport([bug()]));

    expect(parsed[0]).to.include({
      id: 'bug-1', title: 'Crash on save', severity: 'Major', priority: 'High', status: 'Assigned',
    });
    expect(parsed[0].reporter).to.deep.equal({ name: 'Rita' });
  });

  it('should default missing optional fields to null', () => {
    const parsed = JSON.parse(generator.generateReport([bug({ assignee: undefined })]));

    expect(parsed[0].assignee).to.equal(null);
    expect(parsed[0].resolutionNote).to.equal(null);
    expect(parsed[0].verifiedAt).to.equal(null);
  });

  it('should use toObject() when the bug is a Mongoose document', () => {
    const toObject = sinon.stub().returns(bug({ title: 'From toObject' }));

    const parsed = JSON.parse(generator.generateReport([{ toObject }]));

    expect(toObject.calledOnce).to.be.true;
    expect(parsed[0].title).to.equal('From toObject');
  });
});
