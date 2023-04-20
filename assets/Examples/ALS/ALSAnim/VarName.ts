
export enum VarName {
    MovementState = 'MovementState',

    //#region Grounded
    ShouldMove = 'ShouldMove',
    WalkRunBlend = 'WalkRunBlend',
    StrideBlend = 'StrideBlend',
    VelocityBlendF = 'VelocityBlendF',
    VelocityBlendB = 'VelocityBlendB',
    VelocityBlendL = 'VelocityBlendL',
    VelocityBlendR = 'VelocityBlendR',
    MovementDirection = 'MovementDirection',
    //#endregion

    //#region In Air
    Jumped = 'Jumped',
    JumpPlayRate = 'JumpPlayRate',
    JumpWalkRunBlend = 'JumpWalkRunBlend',
    LandHeavyLightBlend = 'LandHeavyLightBlend',
    JumpLandBlend = 'JumpLandBlend',
    //#endregion
}