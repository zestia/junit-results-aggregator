import * as core from '@actions/core';
import * as github from '@actions/github';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as artifact from '@actions/artifact';
import { GeneratedReport, ReportAggregator } from './ReportAggregator';

const REPORT_PREFIX = 'test-report-';

const ARTIFACT_CLIENT = artifact.create();

async function run() {
  const retentionDays = getNumberInput('retention-days');
  // TODO name override

  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'junit-results-summary-'));

  const reportFiles = await fetchReports(tmpDir);

  const aggregator = new ReportAggregator(tmpDir, github.context.workflow);

  for (const report of reportFiles) {
    await aggregator.addProject(report);
  }

  const aggregatedReport = await aggregator.finaliseReport();
  core.setOutput('test-results', aggregatedReport.report);

  await uploadReports(aggregatedReport, retentionDays);
}

async function fetchReports(tmpDir: string): Promise<string[]> {
  const artifacts = await ARTIFACT_CLIENT.downloadAllArtifacts(tmpDir);

  return artifacts
    .map((artifact) => artifact.artifactName)
    .filter((name) => name.startsWith(REPORT_PREFIX));
}

async function uploadReports(
  report: GeneratedReport,
  retentionDays: number | undefined,
): Promise<void> {
  await ARTIFACT_CLIENT.uploadArtifact('summary-test-report', report.files, report.basedir, {
    retentionDays,
  });
}

function getNumberInput(key: string): number | undefined {
  const raw = core.getInput(key);

  if (raw) {
    return parseInt(raw, 10);
  }
}

run().catch((error) => {
  core.error('Unexpected error while processing JUnit results');
  core.debug(error);
  core.setFailed(error);
});
