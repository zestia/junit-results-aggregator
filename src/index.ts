import * as core from '@actions/core';
import * as github from '@actions/github';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as artifact from '@actions/artifact';
import { ReportAggregator } from './ReportAggregator';

const REPORT_PREFIX = 'test-report-';

const ARTIFACT_CLIENT = artifact.create();

async function run() {
  const uploadReport = core.getBooleanInput('upload-report');
  const artifactName = core.getInput('artifact-name');
  const retentionDays = getNumberInput('retention-days');

  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'junit-results-summary-'));

  const reportFiles = await fetchReports(tmpDir);

  const aggregator = new ReportAggregator(tmpDir, github.context.workflow, true);

  for (const report of reportFiles) {
    await aggregator.addProject(report);
  }

  const aggregatedReport = await aggregator.finaliseReport();
  core.setOutput('test-results', aggregatedReport.report);

  if (uploadReport) {
    const targetName = artifactName ? artifactName : 'summary-test-report';

    await ARTIFACT_CLIENT.uploadArtifact(
      targetName,
      aggregatedReport.files,
      aggregatedReport.basedir,
      {
        retentionDays,
      },
    );
  }
}

async function fetchReports(tmpDir: string): Promise<string[]> {
  const artifacts = await ARTIFACT_CLIENT.downloadAllArtifacts(tmpDir);

  return artifacts
    .map((artifact) => artifact.artifactName)
    .filter((name) => name.startsWith(REPORT_PREFIX));
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
