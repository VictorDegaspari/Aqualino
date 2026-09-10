import {Platform} from 'react-native';
import NativeAqualinoWidget from '../../../../specs/NativeAqualinoWidget';
import {requestWidgetPin} from '../application/requestWidgetPin';

jest.mock('../../../../specs/NativeAqualinoWidget', () => ({__esModule: true, default: {requestPinWidget: jest.fn()}}));

afterEach(() => {jest.restoreAllMocks(); jest.clearAllMocks();});

test('opens the native Android widget request and returns launcher support', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(NativeAqualinoWidget.requestPinWidget).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(requestWidgetPin()).resolves.toBe(true);
  await expect(requestWidgetPin()).resolves.toBe(false);
  expect(NativeAqualinoWidget.requestPinWidget).toHaveBeenCalledTimes(2);
});

test('uses manual instructions on iOS without calling the Android request', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await expect(requestWidgetPin()).resolves.toBe(false);
  expect(NativeAqualinoWidget.requestPinWidget).not.toHaveBeenCalled();
});
