
export const GoogleCharts: any;

declare global {
    export namespace google {
        export namespace visualization {
            export interface DataTable {
                getNumberOfRows(): number;

                addRow(row: any[]): void;

                removeRows(from: number, count: number): void;

                setCell(row: number, column: number, value: any): void;
            }

            export function arrayToDataTable(array: any[][]): DataTable;

            export class LineChart {
                constructor(container: HTMLDivElement);

                public draw(data: DataTable, options: unknown): void;
            }

            export class PieChart {
                constructor(container: HTMLDivElement);

                public draw(data: DataTable, options: unknown): void;
            }
        }
    }
}