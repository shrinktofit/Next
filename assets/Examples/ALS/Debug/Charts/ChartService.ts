import { HTML5, PREVIEW } from "cc/env";

const initialize = (() => {
    let initializePromise: Promise<void> | undefined;

    return async function initialize() {
        if (!initializePromise) {
            initializePromise = (async () => {
                const { GoogleCharts } = await import("../../../../../External/GoogleCharts/index.mjs");
                await new Promise<void>((resolve) => {
                    GoogleCharts.load(() => {
                        resolve();
                    }, {
                        packages: ["corechart", "line"],
                    });
                });
            })();
        }
        await initializePromise;
    }
})();

class RealTimeNumberChart {
    constructor({
        valueDescriptions,
    }: {
        valueDescriptions: ValueDescription[];
    }) {
        this.#valueDescriptions = valueDescriptions;
        this.#values = [0, ...valueDescriptions.map(({ defaultValue }) => defaultValue ?? 0.0)];

        const container = document.createElement('div');
        container.id = 'chart_div';
        container.style.width = '1024px';
        container.style.height = '256px';
        container.style.zIndex = '9999';
        document.body.append(container);

        (async () => {
            await initialize();
            this.#onReady(container);
        })();
    }

    public setValue(index: number, value: number) {
        this.#values[index + 1] = value;
    }

    public update() {
        if (!this.#ready) {
            return;
        }
        this.#onUpdate();
    }

    #onReady(container: HTMLDivElement) {
        console.log(`Loaded`);

        // create options object with titles, colors, etc.
        let chartOptions = {
            title: "Velocity Blend",
            hAxis: {
                textPosition: 'none',
            },
            vAxis: {
                title: "Value"
            },
            legend: { position: 'bottom' }
        };

          // create data object with default value
        const dataTable = google.visualization.arrayToDataTable([
            ['Frame', ...this.#valueDescriptions.map(({ displayName }) => displayName)],
            this.#values,
        ]);
        
        // draw chart on load
        const chart = new google.visualization.LineChart(
            container,
        );

        chart.draw(dataTable, chartOptions);

        this._dataTable = dataTable;
        this._chart = chart;
        this.#chartOptions = chartOptions;
        
        this.#ready = true;
    }

    #onUpdate() {
        const dataTable = this._dataTable;
        const maxRows = this.#maxRows;
        
        this.#values[0] = this.#updateIndex;

        if (dataTable.getNumberOfRows() > maxRows) {
            dataTable.removeRows(0, dataTable.getNumberOfRows() - maxRows);
        }
        dataTable.addRow(this.#values);

        this._chart.draw(dataTable, this.#chartOptions);
        ++this.#updateIndex;
    }

    #updateIndex = 0;
    #valueDescriptions: ValueDescription[];
    #values: number[];
    #maxRows = 200;
    #ready = false;
    _dataTable!: google.visualization.DataTable;
    _chart!: google.visualization.LineChart;
    #chartOptions = {

    };
}

interface ValueDescription {
    displayName: string;
    defaultValue?: number;
}

function createRealtimeNumberChart(...args: ConstructorParameters<typeof RealTimeNumberChart>) {
    return new RealTimeNumberChart(...args);
}

const _ = (PREVIEW && HTML5) ? createRealtimeNumberChart : undefined;

export { _ as createRealtimeNumberChart };

export type { RealTimeNumberChart };
