# JUnit Results Aggregator

GitHub action that aggregates JUnit results published from multiple jobs using
[zestia/junit-results-toolkit][junit-results-toolkit].

[junit-results-toolkit]: https://github.com/zestia/junit-results-toolkit

## Usage

Given the following workflow:

```yaml
jobs:
  java-build:
    steps:
      # ... test steps omitted ...
      - name: Parse Test Results
        uses: zestia/junit-results-toolkit@v2
        id: test-results
        if: ${{ always() }}
        with:
          files: '**/TEST-*.xml'

  jest-build:
    # ... test steps omitted ...
    - name: Parse Test Results
      uses: zestia/junit-results-toolkit@v2
      id: test-results
      if: ${{ always() }}
      with:
        files: 'junit.xml'
```

The results from the two jobs can be aggregated using:

```yaml
jobs:
  java-build:
    # ...
  jest-build:
    # ...

  reporting:
    needs:
      - java-build
      - jest-build
    if: ${{ always() }}
    runs-on: ubuntu-latest

    steps:
      - uses: zestia/junit-results-aggregator@v2
        id: test-results

      - name: Echo Aggregate Results
        run: |
          echo "Aggregated Test Results:"
          echo "  Suites:  ${{ fromJson(steps.test-results.summary.test.results).passed }}"
          echo "  Passed:  ${{ fromJson(steps.test-results.outputs.test.results).passed }}"
          echo "  Failed:  ${{ fromJson(steps.test-results.outputs.test.results).failed }}"
          echo "  Skipped: ${{ fromJson(steps.test-results.outputs.test.results).skipped }}"
```

**Note:** it is important to add an `if` clause to ensure that the test results are always aggregated.

A new artifact called `summary-test-report` will be created containing the following:

- `test-report.html` - HTML report summarising the results of each project.
- `project-summary.json` - JSON summary of the projects (see [test-results](#test-results) for contents).
- `java-build-report.html` - HTML report fetched from the `java-build` job.
- `jest-build-report.html` - HTML report fetched from the `jest-build` job.

## Options

| Name             | Description                                                                     | Default                               |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| `retention-days` | Number of days to retain the report artifact.                                   | Repository default (usually 90 days). |
| `upload-report`  | If `true` then an HTML report will be generated & uploaded to `$artifact-name`. | `true`                                |
| `artifact-name`  | Name of the artifact to use when uploading HTML report.                         | `summary-test-report`                 |

## Outputs

### `test-results`

Summary of test results in JSON format.

For example:

```json
{
  "name": "CI",
  "projects": [
    {
      "name": "java-build",
      "summary": {
        "startTime": 1648221085000,
        "duration": 0.032,
        "passed": 2,
        "failed": 0,
        "skipped": 0,
        "tests": 2
      },
      "suites": [
        {
          "startTime": 1648221085000,
          "duration": 0.017,
          "tests": 1,
          "passed": 1,
          "failed": 0,
          "skipped": 0
        },
        {
          "startTime": 1648221085000,
          "duration": 0.015,
          "tests": 1,
          "passed": 1,
          "failed": 0,
          "skipped": 0
        }
      ]
    },
    {
      "name": "jest-build",
      "summary": {
        "startTime": 1648221058000,
        "duration": 0.005,
        "passed": 0,
        "failed": 1,
        "skipped": 0,
        "tests": 1
      },
      "suites": [
        {
          "startTime": 1648221058000,
          "duration": 0.005,
          "tests": 1,
          "passed": 0,
          "failed": 1,
          "skipped": 0
        }
      ]
    }
  ],
  "summary": {
    "startTime": 1648221058000,
    "duration": 0.037,
    "tests": 3,
    "passed": 2,
    "failed": 1,
    "skipped": 0
  }
}
```
