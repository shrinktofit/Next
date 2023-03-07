# 停止移动

## 快速停止

在 ALS 中，快速停止是通过 [播放槽动画](https://docs.unrealengine.com/4.26/en-US/BlueprintAPI/Animation/PlaySlotAnimationasDynamicMontag-/) 完成的。

我们没有提供这个结点，因此选用了类似的效果来实现。

添加了 Base.Slot 层级，用于模拟实现 ALS 播放槽动画。在该层级中：

- 添加状态 Empty，模拟实现 ALS 未播放槽动画的情况。

- 添加状态 QuickStop，模拟实现 ALS 播放槽动画 ALS_Transition_L 的情况。

- 添加过渡 Empty --> QuickStop，模拟播放槽动画的过程。

- 添加过渡 QuickStop --> Empty，模拟自然停止槽动画的过程。

- 添加过渡 QuickStop --> Empty(2)，模拟在动画事件 `AnimNotify_StopTransition` 中强制停止槽动画的过程。

播放槽动画结点的参数对应：

| ALS 播放槽动画参数          | 对应参数                                |
| --------------------------- | --------------------------------------- |
| Blend In Time               | 过渡 Empty --> QuickStop 的过渡周期     |
| Blend Out Time              | 过渡 QuickStop --> Empty 的过渡周期     |
| In Play Rate                | 状态 QuickStop 的速度                   |
| Loop Count                  | 状态 QuickStop 的结束条件               |
| In Time to Start Montage At | 过渡 QuickStop --> Empty 的终点起始时间 |

停止槽动画结点的参数对应：

| ALS 停止槽动画参数 | 对应参数                               |
| ------------------ | -------------------------------------- |
| In Blend Out Time  | 过渡 QuickStop --> Empty(2) 的过渡周期 |
