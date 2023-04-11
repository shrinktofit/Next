
# 已知问题

## 移动

- 往前走切换到往后走时，动作会突变。除非把 Velocity Blend Interop Speed 设置小一点，但是 ALS 不用，为什么？

- 下面的操作流程：
  - 使人物保持正向待机。
  - 按 D 向右走。
    这时候我们和 ALS 都会产生 MoveDirection.Right
  - 加上按 S 向右后走
    这时候 ALS 产生了 MoveDirection.Backward；但是我们会先产生一帧 MoveDirection.Backward，然后下一帧产生 MoveDirection.Right，为什么？

## 倾斜

- 向某个方向移动再停止，触发了两次倾斜效果后，再次往该方向移动，会先错误地往反方向倾斜一段。这可能是因为倾斜功能中，没有重置最后一次倾斜更新之后的“倾斜数量”值。 

