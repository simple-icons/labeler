export const context = {
  payload: {
    pull_request: {
      number: 123,
    },
  },
  repo: {
    owner: 'monalisa',
    repo: 'helloworld',
  },
};

const mockApi = {
  paginate: jest.fn(),
  rest: {
    issues: {
      addLabels: jest.fn(),
      removeLabel: jest.fn(),
    },
    pulls: {
      get: jest.fn().mockResolvedValue({}),
      listFiles: {
        endpoint: {
          merge: jest.fn().mockReturnValue({}),
        },
      },
    },
    repos: {
      getContent: jest.fn(),
    },
  },
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
