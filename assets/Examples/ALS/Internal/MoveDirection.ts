
export enum MoveDirection {
    Forward = 0,
    Backward = 1,
    Left = 2,
    Right = 3,
}

export function calculateMoveDirection(
    current: MoveDirection,
    frThreshold: number,
    flThreshold: number,
    brThreshold: number,
    blThreshold: number,
    buffer: number,
    angle: number,
) {

    if (angleInRange(
        angle,
        flThreshold,
        frThreshold,
        buffer,
        current !== MoveDirection.Forward && current !== MoveDirection.Backward,
    )) {
        return MoveDirection.Forward;
    }

    if (angleInRange(
        angle,
        frThreshold,
        brThreshold,
        buffer,
        current !== MoveDirection.Right && current !== MoveDirection.Left,
    )) {
        return MoveDirection.Right;
    }

    if (angleInRange(
        angle,
        blThreshold,
        flThreshold,
        buffer,
        current !== MoveDirection.Right && current !== MoveDirection.Left,
    )) {
        return MoveDirection.Left;
    }

    return MoveDirection.Backward;
}

function angleInRange(
    angle: number,
    minAngle: number,
    maxAngle: number,
    buffer: number,
    increaseBuffer: boolean,
) {
    if (increaseBuffer) {
        return angle >= (minAngle - buffer) && angle <= (maxAngle + buffer);
    } else {
        return angle >= (minAngle + buffer) && angle <= (maxAngle - buffer);
    }
}
