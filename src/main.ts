import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import {Minimatch} from 'minimatch';

const ALL_STATUS: string[] = ["added", "modified", "removed"];
interface File {
  filename: string;
  status: string;
}

async function run() {
  try {
    const token = core.getInput('repo-token', {required: true});
    const configPath = core.getInput('configuration-path', {required: true});

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log('Could not get pull request number from context, exiting');
      return;
    }

    const client = new github.GitHub(token);

    core.debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles: File[] = await getChangedFiles(client, prNumber);
    const labelGlobs: Map<string, [string[], string[]]> = await getLabelGlobs(
      client,
      configPath
    );

    const labels: string[] = [];
    for (const [label, [globs, status]] of labelGlobs.entries()) {
      core.debug(`processing ${label} (${globs} | ${status})`);
      if (checkGlobs(changedFiles, globs, status)) {
        labels.push(label);
      }
    }

    if (labels.length > 0) {
      await addLabels(client, prNumber, labels);
    }
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getChangedFiles(
  client: github.GitHub,
  prNumber: number
): Promise<File[]> {
  const listFilesResponse = await client.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  const changedFiles = listFilesResponse.data.map(f => ({
    filename: f.filename,
    status: f.status
  }));

  core.debug('found changed files:');
  for (const file of changedFiles) {
    core.debug(`  ${file.filename} (${file.status})`);
  }

  return changedFiles;
}

async function getLabelGlobs(
  client: github.GitHub,
  configurationPath: string
): Promise<Map<string, [string[], string[]]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: string | string[]}`, but is `any`:
  const configObject: any = yaml.safeLoad(configurationContent);

  // transform `any` => `Map<string,string[]>` or throw if yaml is malformed:
  return getLabelGlobMapFromObject(configObject);
}

async function fetchContent(
  client: github.GitHub,
  repoPath: string
): Promise<string> {
  const response: any = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

function getLabelGlobMapFromObject(
  configObject: any
): Map<string, [string[], string[]]> {
  const labelGlobs: Map<string, [string[], string[]]> = new Map();
  for (const label in configObject) {
    if (typeof configObject[label] === 'string') {
      labelGlobs.set(label, [[configObject[label]], ALL_STATUS]);
    } else if (configObject[label] instanceof Array) {
      const globs: string[] = [];
      let status: string[] = ALL_STATUS;
      for (const temp in configObject[label]) {
        if (typeof configObject[label][temp] === "string") {
          globs.push(configObject[label][temp]);
        } else if (typeof configObject[label][temp]["on"] === "string") {
          status = [configObject[label][temp]["on"]];
        } else if (Array.isArray(configObject[label][temp]["on"])) {
          status = configObject[label][temp]["on"];
        } else {
          throw Error(`found unexpected ...`);
        }
      }
      labelGlobs.set(label, [globs, status]);
    } else {
      throw Error(
        `found unexpected type for label ${label} (should be string or array of globs)`
      );
    }
  }

  return labelGlobs;
}

function checkGlobs(
  changedFiles: File[],
  globs: string[],
  status: string[]
): boolean {
  for (const glob of globs) {
    core.debug(` checking pattern ${glob} for status [${status}]`);
    const matcher = new Minimatch(glob);
    for (const changedFile of changedFiles) {
      core.debug(` - ${changedFile.filename}`);
      if (
        matcher.match(changedFile.filename) &&
        status.includes(changedFile.status)
      ) {
        core.debug(` ${changedFile.filename} matches glob and status`);
        return true;
      }
    }
  }
  return false;
}

async function addLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
}

run();
