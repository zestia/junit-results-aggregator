import * as io from '@actions/io';
import * as path from 'path';
import { ProjectReport } from './model/ProjectReport';
import { promises as fsPromises } from 'fs';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import * as ejs from 'ejs';
import { AggregateReport } from './model/AggregateReport';

const SUMMARY_FILENAME = 'project-summary.json';
const HTML_FILENAME = 'test-report.html';

export interface GeneratedReport {
  report: AggregateReport;
  basedir: string;
  files: string[];
}

function formatTestDuration(s: number): string {
  if (s < 60) {
    return `${s.toFixed(2)} seconds`;
  }

  // convert into date-fns duration
  const duration = intervalToDuration({
    start: 0,
    end: s * 1000,
  });

  return formatDuration(duration);
}

export class ReportAggregator {
  private readonly tmpDir: string;
  private readonly targetDir: string;

  private readonly output: GeneratedReport;

  constructor(tmpDir: string, projectName: string) {
    this.tmpDir = tmpDir;
    this.targetDir = path.join(tmpDir, 'aggregate-report');

    this.output = {
      report: new AggregateReport(projectName),
      basedir: this.targetDir,
      files: [],
    };
  }

  async addProject(name: string): Promise<void> {
    await io.mkdirP(this.targetDir);

    // load summary & combine add it to the summary
    const projectSummary = await this.loadProjectReport(name);

    this.output.report.addReport(projectSummary);

    // copy html report & add to list of files
    const projectReportFile = await this.copyProjectHtmlReport(name);
    this.output.files.push(projectReportFile);
  }

  async finaliseReport(): Promise<GeneratedReport> {
    const jsonSummary = await this.generateSummaryJson();
    const htmlSummary = await this.generateSummaryReport();

    this.output.files.push(jsonSummary, htmlSummary);

    return this.output;
  }

  private async loadProjectReport(name: string): Promise<ProjectReport> {
    const summaryFile = await this.getReportPath(name, SUMMARY_FILENAME);
    const data = await fsPromises.readFile(summaryFile, { encoding: 'utf-8' });
    return JSON.parse(data);
  }

  private async copyProjectHtmlReport(name: string): Promise<string> {
    const reportFile = await this.getReportPath(name, HTML_FILENAME);
    const targetFile = path.join(
      this.targetDir,
      `${name.replace(/^test-report-/, '')}-report.html`,
    );

    await io.cp(reportFile, targetFile);
    return targetFile;
  }

  private async getReportPath(projectName: string, reportName: string): Promise<string> {
    const reportFile = path.join(this.tmpDir, projectName, reportName);
    const reportStat = await fsPromises.stat(reportFile);

    if (!reportStat.isFile()) {
      throw new Error(`Cannot locate ${reportName} for ${projectName} project`);
    }

    return reportFile;
  }

  private async generateSummaryJson(): Promise<string> {
    const summaryFile = path.join(this.targetDir, SUMMARY_FILENAME);
    await fsPromises.writeFile(summaryFile, JSON.stringify(this.output.report));
    return summaryFile;
  }

  private async generateSummaryReport(): Promise<string> {
    const report = await ejs.renderFile(path.join(__dirname, 'templates', 'summary.ejs'), {
      report: this.output.report,
      datePattern: 'HH:mm:ss, do MMMM, yyyy',
      formatDate: format,
      formatTestDuration,
    });

    const reportFile = path.join(this.targetDir, HTML_FILENAME);
    await fsPromises.writeFile(reportFile, report);

    return reportFile;
  }
}
