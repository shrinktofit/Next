export interface PPCalculateRotationAmount {
    type: 'calculate-rotation-amount';

    root?: string;

    curveName?: string;

    linearKeyReductionEnabled?: boolean;

    linearKeyReductionTolerance?: number;
}

export type Process = PPCalculateRotationAmount;

export interface PPAnim {
    source: string;

    processes: Process[];
}