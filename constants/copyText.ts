import * as Clipboard from "expo-clipboard"
import Alerts from "./Alerts";

export const copyText = async (text: string, info: string = 'Berhasil Salin') => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alerts(info, "info");
  };