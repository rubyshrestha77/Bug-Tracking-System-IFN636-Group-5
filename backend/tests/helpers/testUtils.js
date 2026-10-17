// for the Chai + Mocha + Sinon tests (not a test file itself).
const sinon = require('sinon');

// Express response: status() is chainable, json()/send() are spies.
const mockRes = () => ({
  status: sinon.stub().returnsThis(),
  json: sinon.spy(),
  send: sinon.spy(),
  setHeader: sinon.spy(),
});

// Mongoose query. Chain methods (populate/sort/select/...) return the
// same object and `await query` resolves to `result` (or rejects with `error`).
const fakeQuery = (result, error) => {
  const q = {
    populate: sinon.stub().returnsThis(),
    sort: sinon.stub().returnsThis(),
    select: sinon.stub().returnsThis(),
    skip: sinon.stub().returnsThis(),
    limit: sinon.stub().returnsThis(),
    lean: sinon.stub().returnsThis(),
    then: (resolve, reject) =>
      (error ? Promise.reject(error) : Promise.resolve(result)).then(resolve, reject),
  };
  return q;
};

module.exports = { mockRes, fakeQuery };
