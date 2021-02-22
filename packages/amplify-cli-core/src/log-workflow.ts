import * as path from 'path';
import { EOL, homedir } from 'os';
import { ensureDirSync, existsSync, readFileSync, writeFileSync, readdirSync, lstatSync } from 'fs-extra';
import { yamlDump, yamlParse } from 'yaml-cfn';
import { template } from 'lodash';
function getLogPath(): string {
  const logPathDir = path.join(homedir(), 'workflowlogs');
  ensureDirSync(logPathDir);
  const logPath = path.join(logPathDir, 'logs.json');
  return logPath;
}

function getData(): any[] {
  const logPath = getLogPath();
  const data = [];
  if (existsSync(logPath)) {
    data.push(...JSON.parse(readFileSync(logPath, 'utf-8')));
  }
  return data;
}

export function recordData(context: { params: string; workflows: any[] }) {
  const data = getData();
  data.push({
    commands: context.params,
    workflows: context.workflows,
    identifier: process.env.WORKFLOW_ID,
  });
  writeFile(data);
}

function writeFile(data: any[]) {
  const logPath = getLogPath();
  writeFileSync(logPath, JSON.stringify(data, null, 4));
}

export function getState(cwd: string): any[] {
  const currentCloudBackend = path.join(cwd, 'amplify', '#current-cloud-backend');
  const data: any[] = [];
  if (existsSync(currentCloudBackend)) {
    const directories = readdirSync(currentCloudBackend);
    directories.forEach(category => {
      const categoryDirectory = path.join(currentCloudBackend, category);
      if (isDir(categoryDirectory)) {
        const subDirectories = readdirSync(categoryDirectory);
        subDirectories.forEach(subDirectory => {
          let subDirectoryPath = path.join(categoryDirectory, subDirectory);
          if (isDir(subDirectoryPath)) {
            const subDirectoryBuildPath = path.join(subDirectoryPath, 'build');
            if (existsSync(subDirectoryBuildPath)) {
              subDirectoryPath = subDirectoryBuildPath;
            }
            const items = readdirSync(subDirectoryPath);
            const state = {
              category,
              subDirectory,
              cfn: '',
              parameters: '',
              nestedCfn: [] as string[],
            };

            items.forEach(item => {
              if (item.includes('template')) {
                state.cfn = readAndExtract(path.join(subDirectoryPath, item));
              }
              if (item.includes('parameter')) {
                state.parameters = JSON.stringify(JSON.parse(readFileSync(path.join(subDirectoryPath, item), 'utf-8')));
              }
            });
            const subDirectorBuildStacksPath = path.join(subDirectoryPath, 'stacks');
            if (existsSync(subDirectorBuildStacksPath)) {
              const subStacks = readdirSync(subDirectorBuildStacksPath);
              state.nestedCfn.push(...subStacks.map(r => readAndExtract(path.join(subDirectorBuildStacksPath, r))));
            }
            data.push(state);
          }
        });
      }
    });
  }
  const backend = path.join(cwd, 'amplify', 'backend', 'awscloudformation', 'nested-cloudformation-stack.yml');

  if (existsSync(backend)) {
    data.push({
      category: 'root',
      cfn: readAndExtract(backend),
    });
  } else {
    const rootStackPath = '../amplify-provider-awscloudformation/resources/rootStackTemplate.json';
    data.push({
      category: 'root',
      cfn: readAndExtract(rootStackPath),
    });
  }
  return data;
}
function readAndExtract(path: string): string {
  const cfnString = readFileSync(path, 'utf-8');
  let cfn;
  if (!IsJsonString(cfnString)) {
    cfn = yamlParse(cfnString);
  } else {
    cfn = JSON.parse(cfnString);
  }
  return yamlDump(cfn);
}

function isDir(dir: string): boolean {
  try {
    return lstatSync(dir).isDirectory();
  } catch (e) {
    return false;
  }
}

function IsJsonString(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
