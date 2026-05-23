# Layout compatibility tests

This runner compares DOM geometry across Chrome 57, Chrome 76, and Chrome 115.
Chrome 115 is used as the baseline.

## Commands

```bash
npm run build:web
npm run test:layout:smoke
npm run test:layout
```

Useful filters:

```bash
npm run test:layout:smoke -- --targets=115,76 --fixtures=P1S_IDLE --viewports=320x568 --routes=/home
```

## Fixtures

Fixture data is JSON driven. Put any number of `*.json` files in
`tools/chrome-layout-diff/fixtures/`; the runner discovers them automatically and
uses each file name, without `.json`, as the fixture name.

Each JSON file may contain:

```json
{
  "print": null,
  "module": null,
  "project": null
}
```

For connected states, `print` matches `DevicePrint` and `module` matches
`Module[]` from `@bambulab-p1screen/printer-api`. `deviceRecord` is optional;
when it is omitted, the chrome-layout-diff runtime creates a local test device from
`module[0].sn` and `module[0].product_name`.

The frontend loads the selected fixture from
`/__chrome-layout-diff-fixtures/<fixture-name>.json` before the Vue app mounts, then stubs
printer networking so the page is deterministic.

Browser targets, per-fixture route limits, and ignored DOM selectors are
configured in `tools/chrome-layout-diff/config.ts`. Fixtures without an entry run the
full selected route set. The default ignored selector list includes `.hint`.

## Browser setup

Chrome 57 is run as real headed Chrome in Xvfb and captured through CDP so its
viewport and screenshot size can be validated exactly. Chrome 76 and Chrome 115
are run through Selenium Docker images derived from the configured major
versions. The runner validates the actual browser major version before capture.

Docker Chrome containers access the local static server through the
`chrome-layout-diff-host` alias injected with Docker `--add-host`.

The runner keeps one capture session open per Chrome target and viewport, then
runs every matching route and fixture in that session. Viewports still get
separate sessions because Chrome 57 depends on an exact Xvfb screen size for
correct full-page geometry.

You can also point a target at an existing WebDriver endpoint:

```bash
CHROME_LAYOUT_DIFF_WEBDRIVER_57=http://127.0.0.1:4457/wd/hub npm run test:layout:smoke
```

## Output

Results are written to `chrome-layout-diff-results/`:

- `chrome-layout-diff-results.json`
- `chrome-layout-diff-report.html`
- `snapshots/*.json`
- `screenshots/*.png`
