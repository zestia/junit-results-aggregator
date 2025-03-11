import { ReportAggregator } from '../ReportAggregator';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import * as fs from 'fs';
import * as io from '@actions/io';

describe('ReportAggregator', () => {
  test('generate for empty project', async () => {
    const { tmpDir, aggregator } = await createAggregator([]);

    const report = await aggregator.finaliseReport();

    // summary
    expect(report.report.name).toBe('test');
    expect(report.report.summary.duration).toBe(0);
    expect(report.report.summary.tests).toBe(0);
    expect(report.report.summary.passed).toBe(0);
    expect(report.report.summary.failed).toBe(0);
    expect(report.report.summary.skipped).toBe(0);
    expect(report.report.projects.length).toBe(0);

    // output directory
    expect(report.basedir).toBe(path.join(tmpDir, 'aggregate-report'));
    expect(fs.existsSync(report.basedir)).toBeTruthy();

    // report files
    expect(report.files.sort()).toEqual([
      path.join(report.basedir, 'project-summary.json'),
      path.join(report.basedir, 'test-report.html'),
    ]);

    // check generated summary file
    const summaryJson = await fsPromises.readFile(
      path.join(report.basedir, 'project-summary.json'),
      { encoding: 'utf-8' },
    );
    expect(summaryJson).toEqual(JSON.stringify(report.report));
  });

  test('should parse project and add to output', async () => {
    const { tmpDir, aggregator } = await createAggregator(['project-1']);

    await aggregator.addProject(path.join(tmpDir, 'project-1'));
    const report = await aggregator.finaliseReport();

    // summary
    expect(report.report.name).toBe('test');
    expect(report.report.summary.duration).toBe(0.032);
    expect(report.report.summary.tests).toBe(3);
    expect(report.report.summary.passed).toBe(2);
    expect(report.report.summary.failed).toBe(1);
    expect(report.report.summary.skipped).toBe(0);

    // projects
    expect(report.report.projects.length).toBe(1);

    // project-1 values
    expect(report.report.projects[0].name).toBe('project-1 build');
    expect(report.report.projects[0].summary.duration).toBe(0.032);
    expect(report.report.projects[0].summary.tests).toBe(3);
    expect(report.report.projects[0].summary.passed).toBe(2);
    expect(report.report.projects[0].summary.failed).toBe(1);
    expect(report.report.projects[0].summary.skipped).toBe(0);
    expect(report.report.projects[0].suites.length).toBe(3);

    // report files
    expect(report.files.sort()).toEqual([
      path.join(report.basedir, 'project-1-report.html'),
      path.join(report.basedir, 'project-summary.json'),
      path.join(report.basedir, 'test-report.html'),
    ]);

    // check generated summary file
    const summaryJson = await fsPromises.readFile(
      path.join(report.basedir, 'project-summary.json'),
      { encoding: 'utf-8' },
    );
    expect(summaryJson).toEqual(JSON.stringify(report.report));

    // check html report for project-1 was copied
    await matchy(
      path.join(__dirname, 'projects', 'project-1', 'test-report.html'),
      path.join(report.basedir, 'project-1-report.html'),
    );
  });

  test('combine 2 reports', async () => {
    const { tmpDir, aggregator } = await createAggregator(['project-1', 'project-2']);

    await aggregator.addProject(path.join(tmpDir, 'project-1'));
    await aggregator.addProject(path.join(tmpDir, 'project-2'));
    const report = await aggregator.finaliseReport();

    // summary
    expect(report.report.name).toBe('test');
    expect(report.report.summary.duration).toBe(15.255);
    expect(report.report.summary.tests).toBe(4);
    expect(report.report.summary.passed).toBe(3);
    expect(report.report.summary.failed).toBe(1);
    expect(report.report.summary.skipped).toBe(0);

    // projects
    expect(report.report.projects.length).toBe(2);

    // project values
    expect(report.report.projects[0].name).toBe('project-1 build');
    expect(report.report.projects[1].name).toBe('project-2 build');

    // report files
    expect(report.files.sort()).toEqual([
      path.join(report.basedir, 'project-1-report.html'),
      path.join(report.basedir, 'project-2-report.html'),
      path.join(report.basedir, 'project-summary.json'),
      path.join(report.basedir, 'test-report.html'),
    ]);
  });

  test('should throw error when adding unknown project', async () => {
    const { tmpDir, aggregator } = await createAggregator([]);

    try {
      await aggregator.addProject(path.join(tmpDir, 'unknown'));
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toMatch(/Cannot locate report for \[.*\/unknown] project/);
      } else {
        fail(`unexpected error type: ${typeof e}`);
      }
    }
  });

  test("should not throw error on unknown project if 'failOnMissingReport' is false", async () => {
    const { tmpDir, aggregator } = await createAggregator([], false);

    // add project
    await aggregator.addProject(path.join(tmpDir, 'unknown'));

    // report should still be empty
    const report = await aggregator.finaliseReport();
    expect(report.report.projects.length).toBe(0);
  });
});

interface AggregatorFixture {
  tmpDir: string;
  aggregator: ReportAggregator;
}

async function createAggregator(
  projects: string[],
  failOnMissingReport = true,
): Promise<AggregatorFixture> {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'junit-results-summary-'));

  for (const project of projects) {
    const srcDir = path.join(__dirname, 'projects', project);

    await io.cp(srcDir, tmpDir, { recursive: true });
  }

  const aggregator = new ReportAggregator(tmpDir, 'test', failOnMissingReport);

  return {
    tmpDir,
    aggregator,
  };
}

async function matchy(expected: string, actual: string): Promise<void> {
  const e = fsPromises.readFile(expected, { encoding: 'utf-8' });
  const a = fsPromises.readFile(actual, { encoding: 'utf-8' });

  expect(a).toEqual(e);
}
