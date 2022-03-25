import { TestSummary } from './TestSummary';
import { ProjectReport } from './ProjectReport';
import { isBefore } from 'date-fns';

export class AggregateReport {
  readonly name: string;
  readonly projects: ProjectReport[];
  readonly summary: TestSummary;

  constructor(name: string) {
    this.name = name;
    this.projects = [];

    this.summary = {
      startTime: new Date(),
      duration: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  addReport(report: ProjectReport): void {
    this.projects.push(report);

    // take the older start time
    if (isBefore(this.summary.skipped, report.summary.startTime)) {
      this.summary.startTime = report.summary.startTime;
    }

    // add duration
    this.summary.duration += report.summary.duration;

    // increment counters
    this.summary.tests += report.summary.tests;
    this.summary.passed += report.summary.passed;
    this.summary.failed += report.summary.failed;
    this.summary.skipped += report.summary.skipped;
  }
}
