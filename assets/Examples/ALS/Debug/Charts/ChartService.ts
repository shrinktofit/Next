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

abstract class RealTimeNumberChart {
    constructor({
        valueDescriptions,
    }: {
        valueDescriptions: ValueDescription[];
        minValue?: number;
        maxValue?: number;
        chart?: {
            type: 'line' | 'pie';
        };
    }) {
        this.#valueDescriptions = valueDescriptions;
        this.#values = valueDescriptions.map(({ defaultValue }) => defaultValue ?? 0.0);

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
        this.#values[index] = value;
    }

    public update() {
        if (!this.#ready) {
            return;
        }
        this.#onUpdate();
    }

    #onReady(
        container: HTMLDivElement,
    ) {
        console.log(`Loaded`);

        const chartOptions = {
            title: "Velocity Blend",
            legend: { position: 'bottom' },
            series: {
                0: { color: '#D7CAFF' },
                1: { color: '#ff0000' },
                2: { color: '#00ff00' },
                3: { color: '#0000ff' },
            },
        }
        
        this.makeOptions(chartOptions);

        const chart = new google.visualization.PieChart(
            container,
        );

        const dataTable = google.visualization.arrayToDataTable(this.initializeDataTable(
            this.#valueDescriptions,
            this.#values,
        ));

        chart.draw(dataTable, chartOptions);

        this._dataTable = dataTable;
        this._chart = chart;
        this.#chartOptions = chartOptions;
        
        this.#ready = true;
    }

    #onUpdate() {
        const dataTable = this._dataTable;
        this.commit(
            dataTable,
            this.#values,
        );
        this._chart.draw(dataTable, this.#chartOptions);
    }

    #valueDescriptions: ValueDescription[];
    #values: number[];
    #ready = false;
    _dataTable!: google.visualization.DataTable;
    _chart!: google.visualization.LineChart | google.visualization.PieChart;
    #chartOptions = {

    };

    protected abstract makeOptions(options: Record<string, unknown>): void;

    protected abstract initializeDataTable(
        valueDescriptions: readonly ValueDescription[],
        values: readonly number[],
    ): any[][];

    protected abstract commit(
        dataTable: google.visualization.DataTable,
        values: readonly number[],
    ): void;
}

class LineChart extends RealTimeNumberChart {
    constructor(...args: ConstructorParameters<typeof RealTimeNumberChart>) {
        super(...args);
        const [{
            minValue,
            maxValue,
        }] = args;
        this.#minValue = minValue;
        this.#maxValue = maxValue;
    }

    protected initializeDataTable(
        valueDescriptions: readonly ValueDescription[],
        values: readonly number[],
    ): any[][] {
        return [
            ['Frame', ...valueDescriptions.map(({ displayName }) => displayName)],
        ];
    }

    protected makeOptions(options: Record<string, unknown>) {
        Object.assign(options, {
            hAxis: {
                textPosition: 'none',
            },
            vAxis: {
                title: "Value",
                minValue: this.#minValue,
                maxValue: this.#maxValue,
            },
        });
    }

    protected commit(
        dataTable: google.visualization.DataTable,
        values: readonly number[],
    ) {
        const maxRows = this.#maxRows;
    
        if (dataTable.getNumberOfRows() > maxRows) {
            dataTable.removeRows(0, dataTable.getNumberOfRows() - maxRows);
        }
        dataTable.addRow([this.#updateIndex, ...values]);

        ++this.#updateIndex;
    }

    #minValue: number | undefined = undefined;
    #maxValue: number | undefined = undefined;
    #maxRows = 200;
    #updateIndex = 0;
}

class PieChart extends RealTimeNumberChart {
    protected initializeDataTable(
        valueDescriptions: readonly ValueDescription[],
        values: readonly number[],
    ): any[][] {
        return [
            ['Name', 'Value'],
            ...valueDescriptions.map((vd, index) => {
                return [vd.displayName, values[index]];
            }),
        ];
    }

    protected makeOptions(options: Record<string, unknown>) {
        options.pieHole = 0.4;
    }

    protected commit(
        dataTable: google.visualization.DataTable,
        values: readonly number[],
    ) {
        values.forEach((v, index) => {
            dataTable.setCell(index, 1, v);
        });
    }
}

interface ValueDescription {
    displayName: string;
    defaultValue?: number;
}

function createRealtimeNumberChart(...args: ConstructorParameters<typeof RealTimeNumberChart>) {
    const [
        options,
    ] = args;
    const {
        chart = {
            type: 'line',
        },
    } = options;
    if (chart.type === 'line') {
        return new LineChart(...args);
    } else {
        return new PieChart(...args);
    }
}

const _ = (PREVIEW && HTML5) ? createRealtimeNumberChart : undefined;

export { _ as createRealtimeNumberChart };

export type { RealTimeNumberChart };
