import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { run } from '../src/labeler.js';
import { getOctokit } from '@actions/github';
import * as core from '@actions/core';

const gh = getOctokit('token');
const addLabelsMock = jest.spyOn(gh.rest.issues, 'addLabels');
const removeLabelMock = jest.spyOn(gh.rest.issues, 'removeLabel');
const reposMock = jest.spyOn(gh.rest.repos, 'getContent');
const paginateMock = jest.spyOn(gh, 'paginate');
const getPullMock = jest.spyOn(gh.rest.pulls, 'get');
const getInputMock = core.getInput as jest.MockedFunction<typeof core.getInput>;
const getBooleanInputMock = core.getBooleanInput as jest.MockedFunction<
  typeof core.getBooleanInput
>;

const yamlFixtures = {
  'only_pdfs.yml': readFileSync('__tests__/fixtures/only_pdfs.yml'),
};

afterAll(() => jest.restoreAllMocks());

describe('run', () => {
  it('adds labels to PRs that match our glob patterns', async () => {
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.pdf');

    await run();

    expect(removeLabelMock).toHaveBeenCalledTimes(0);
    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['touched-a-pdf-file'],
    });
  });

  it('does not add labels to PRs that do not match our glob patterns', async () => {
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');

    await run();

    expect(removeLabelMock).toHaveBeenCalledTimes(0);
    expect(addLabelsMock).toHaveBeenCalledTimes(0);
  });

  it('(with sync-labels: true) it deletes preexisting PR labels that no longer match the glob pattern', async () => {
    const mockInput = {
      'repo-token': 'foo',
      'configuration-path': 'bar',
    };

    getInputMock.mockImplementation((name: string, ...opts) => mockInput[name]);

    const mockBooleanInput = {
      'sync-labels': true,
    };

    getBooleanInputMock.mockImplementation(
      (name: string, ...opts) => mockBooleanInput[name],
    );

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{ name: 'touched-a-pdf-file' }],
      },
    });

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(1);
    expect(removeLabelMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      name: 'touched-a-pdf-file',
    });
  });

  it('(with sync-labels: false) it issues no delete calls even when there are preexisting PR labels that no longer match the glob pattern', async () => {
    const mockInput = {
      'repo-token': 'foo',
      'configuration-path': 'bar',
    };

    getInputMock.mockImplementation((name: string, ...opts) => mockInput[name]);

    const mockBooleanInput = {
      'sync-labels': false,
    };

    getBooleanInputMock.mockImplementation(
      (name: string, ...opts) => mockBooleanInput[name],
    );

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{ name: 'touched-a-pdf-file' }],
      },
    });

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(0);
  });
});

function usingLabelerConfigYaml(fixtureName: keyof typeof yamlFixtures): void {
  reposMock.mockResolvedValue(<any>{
    data: { content: yamlFixtures[fixtureName], encoding: 'utf8' },
  });
}

function mockGitHubResponseChangedFiles(...files: string[]): void {
  const returnValue = files.map((f) => ({ filename: f, status: 'modified' }));
  paginateMock.mockReturnValue(<any>returnValue);
}
