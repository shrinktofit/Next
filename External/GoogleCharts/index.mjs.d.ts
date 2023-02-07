
export const GoogleCharts: any;

declare global {
    export namespace google {
        export namespace visualization {
            export interface DataTable {
                getNumberOfRows(): number;

                addRow(row: any[]): void;

                removeRows(from: number, count: number): void;
            }

            export function arrayToDataTable(array: any[][]): DataTable;

            export class LineChart {
                constructor(container: HTMLDivElement);

                public draw(data: DataTable, options: unknown): void;
            }
        }
    }
}