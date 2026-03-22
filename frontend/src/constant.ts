import { FanType } from './services/device'

export const fans: { type: FanType, name: string }[] = [{
  type: FanType.Part,
  name: '部件'
}, {
  type: FanType.Aux,
  name: '辅助'
}, {
  type: FanType.Chamber,
  name: '机箱'
}]
