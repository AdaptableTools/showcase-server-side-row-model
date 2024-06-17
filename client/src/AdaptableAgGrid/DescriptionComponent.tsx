export const DescriptionComponent = () => {
  return (
    <div style={{ fontSize: 'smaller' }}>
      <h3>About this Demo</h3>
      <ul>
        <li>
          This example shows AdapTable using the AG Grid <b>Serverside Row Model</b>
        </li>
        <li>
          The data is the same as which AG Grid uses for its{' '}
          <a
            href="https://www.ag-grid.com/react-data-grid/server-side-operations-nodejs/"
            target="_blank"
          >
            nodejs demo
          </a>
        </li>
        <li>This allows us to illustrate what is and is not available when using this RowModel</li>
        <li>
          In particular it demonstrates how when using Server-Side Row Model you can:
          <ul>
            <li>Evaluate Predicates</li>
            <li>Evaluate Expressions (used in Queries, Alerts and Calculated Columns)</li>
            <li>Create Pivot Layouts</li>
            <li>Provide Custom Sorts</li>
            <li>Get Distinct Column Values</li>
          </ul>
        </li>
        <li>
          This is done using a mock SQLService which mimics how AdapTableQL works - and which
          evaluates both Predicates and Expressions.
        </li>
        <li>We also use ExpressionOptions to limit which Expression Functions are available</li>
      </ul>

      <h3>Source Code</h3>
      <ul>
        <li>
          The full source code for this demo is available{' '}
          <a
            href="https://github.com/AdaptableTools/showcase-server-side-row-model"
            target="_blank"
          >
            in the Github repo
          </a>
          .
        </li>
        <li>
          This includes the source code for:
          <ul>
            <li>
              <a
                href="https://github.com/AdaptableTools/showcase-server-side-row-model/blob/master/server/SqlService.ts"
                target="_blank"
              >
                the mock SQLService
              </a>
            </li>
            <li>
              <a
                href="https://github.com/AdaptableTools/showcase-server-side-row-model/blob/master/server/SqlService.ts#L128"
                target="_blank"
              >
                Filters Evaluation
              </a>
            </li>
            <li>
              {' '}
              <a
                href="https://github.com/AdaptableTools/showcase-server-side-row-model/blob/master/server/SqlService.ts#L508"
                target="_blank"
              >
                Expressions Evaluation
              </a>
            </li>
          </ul>
        </li>
        <li>
          <p>
            <b>
              Note: The code provided here is "rough and ready" for demonstration purposes only - it
              should not be used "as is" in a production system
            </b>
          </p>
        </li>
      </ul>

      <h3>Setting up the Demo</h3>
      <p>
        Many AdapTable Objects and functions have been provided to the Demo via{' '}
        <a href="https://docs.adaptabletools.com/guide/reference-config-overview" target="_blank">
          Predefined Config
        </a>{' '}
        and{' '}
        <a href="https://docs.adaptabletools.com/guide/reference-options-overview" target="_blank">
          AdapTable Options
        </a>{' '}
        including:
      </p>
      <h4>Dashboard</h4>
      <ul>
        <li>
          2 Tabs:
          <ul>
            <li>
              <i>Main</i>: Layout and Query Toolbars, and a Custom Toolbar with a 'READ ME' button
            </li>
            <li>
              <i>Data</i>: Alert, System Status, and a Custom (<code>Data Loading</code>) Toolbar
            </li>
          </ul>
          <li>
            The Custom Toolbar contains an "Update Data" button which allows you to mimic data
            changes (so that Alerts can be triggered)
          </li>
        </li>
      </ul>
      <h4>Settings Panel</h4>
      <ul>
        <li>This Read Me page has been added as a Custom Settings Panel</li>
      </ul>
    </div>
  );
};
