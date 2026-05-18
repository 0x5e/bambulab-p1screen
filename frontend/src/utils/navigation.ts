const DEVICE_LIST_POPUP_RESTORE_KEY = 'bambulab-p1screen:restore-device-list-popup'

export const markDeviceListPopupRestore = () => {
  sessionStorage.setItem(DEVICE_LIST_POPUP_RESTORE_KEY, '1')
}

export const consumeDeviceListPopupRestore = () => {
  const shouldRestore = sessionStorage.getItem(DEVICE_LIST_POPUP_RESTORE_KEY) === '1'
  sessionStorage.removeItem(DEVICE_LIST_POPUP_RESTORE_KEY)
  return shouldRestore
}
