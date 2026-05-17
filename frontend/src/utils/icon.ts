import { client } from '../printer'
import hmsOkIcon from '../assets/images/hms_ok.png'
import hmsErrorIcon from '../assets/images/hms_error.png'
import humLevel1Icon from '../assets/images/hum_level1_no_num_dark.svg'
import humLevel2Icon from '../assets/images/hum_level2_no_num_dark.svg'
import humLevel3Icon from '../assets/images/hum_level3_no_num_dark.svg'
import humLevel4Icon from '../assets/images/hum_level4_no_num_dark.svg'
import humLevel5Icon from '../assets/images/hum_level5_no_num_dark.svg'
import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import signalNoIcon from '../assets/images/monitor_signal_no.svg'
import signalWeakIcon from '../assets/images/monitor_signal_weak.svg'
import signalMiddleIcon from '../assets/images/monitor_signal_middle.svg'
import signalStrongIcon from '../assets/images/monitor_signal_strong.svg'

export const hmsIcon = (ok: boolean) => ok ? hmsOkIcon : hmsErrorIcon

export const humIcon = (humidity: string) => [humLevel1Icon, humLevel1Icon, humLevel2Icon, humLevel3Icon, humLevel4Icon, humLevel5Icon][Number(humidity)]

export const lightIcon = (on: boolean) => on ? lightOnIcon : lightOffIcon

export const wifiSignalIcon = () => {
  if (!client.mqttClient?.connected) {
    return signalNoIcon
  }

  const percent = client.getWifiSignalPercentage()
  if (percent >= 75) {
    return signalStrongIcon
  } else if (percent >= 50) {
    return signalMiddleIcon
  } else {
    return signalWeakIcon
  }
}
