// Mock for mailgun.js
const mockClient = {
  messages: {
    create: jest.fn().mockResolvedValue({ id: 'mock-id', message: 'Queued' }),
  },
};

const mockMailgun = function() {
  return { client: function() { return mockClient; } };
};

module.exports = mockMailgun;
module.exports.default = mockMailgun;
module.exports.Interfaces = {};
