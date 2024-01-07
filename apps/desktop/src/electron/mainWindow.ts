import { delay } from '@tonkeeper/core/dist/utils/common';
import { BrowserWindow, ipcMain } from 'electron';
import isDev from 'electron-is-dev';
import path from 'path';
import { handleBackgroundMessage } from '../electron/background';
import { Message } from '../libs/message';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export abstract class MainWindow {
    static mainWindow: BrowserWindow | undefined = undefined;

    static async openMainWindow() {
        if (this.mainWindow != undefined) return this.mainWindow;

        const icon = (() => {
            switch (process.platform) {
                case 'darwin':
                    return path.join(process.cwd(), 'public', 'icon.icns');
                case 'linux':
                    return path.join(__dirname, '../../../', 'public', 'icon.png');
                case 'win32':
                    return path.join(process.cwd(), 'public', 'icon.ico');
                default:
                    return '';
            }
        })();

        // Create the browser window.
        this.mainWindow = new BrowserWindow({
            icon: icon,
            width: process.platform == 'linux' ? 438 : 450,
            height: 700,
            resizable: isDev,
            autoHideMenuBar: process.platform != 'darwin',
            webPreferences: {
                zoomFactor: process.platform !== 'linux' ? 0.8 : undefined,
                preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
            }
        });

        // and load the index.html of the app.
        this.mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

        if (isDev) {
            // Open the DevTools.
            this.mainWindow.webContents.openDevTools();
        }

        this.mainWindow.on('closed', () => {
            ipcMain.removeHandler('message');
            this.mainWindow = null;
        });

        ipcMain.handle('message', async (event, message: Message) => {
            try {
                return await handleBackgroundMessage(message);
            } catch (e) {
                return e;
            }
        });

        await delay(500);

        return this.mainWindow;
    }
}