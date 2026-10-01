import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getGameExePathForScene: vi.fn(),
    getCurrentScene: vi.fn(),
    resolveWineLaunch: vi.fn(),
    startWineFridaConnection: vi.fn(),
}));

vi.mock('electron', () => ({
    BrowserWindow: class BrowserWindow {},
    ipcMain: { handle: vi.fn() },
    dialog: {},
}));

vi.mock('../util.js', () => ({
    BASE_DIR: '/test-gsm',
    getAssetsDir: () => '/test-gsm/assets',
    isWindows: () => false,
    isLinux: () => true,
    sanitizeFilename: (value: string) => value,
}));

vi.mock('../main.js', () => ({
    mainWindow: null,
    sendReloadSettings: vi.fn(),
    sendTextHookLine: vi.fn(),
    sendTextHookStatus: vi.fn(),
}));

vi.mock('../store.js', () => ({
    getGameExePathForScene: mocks.getGameExePathForScene,
    setGameExePathForScene: vi.fn(),
}));

vi.mock('./obs.js', () => ({
    getCurrentScene: mocks.getCurrentScene,
    getExecutableNameFromSource: vi.fn().mockResolvedValue('steam_app_123'),
    getWindowTitleFromSource: vi.fn().mockResolvedValue(null),
    syncProcessPausingTargetForCurrentScene: vi.fn(),
}));

vi.mock('./linux_wine.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./linux_wine.js')>()),
    resolveWineLaunch: mocks.resolveWineLaunch,
    findLinuxGamePid: vi.fn().mockReturnValue(0),
}));

vi.mock('./wine_frida.js', () => ({
    startWineFridaConnection: mocks.startWineFridaConnection,
}));

vi.mock('./agent.js', () => ({
    callAgentUiRpc: vi.fn(),
    configureAgentHookCallbacks: vi.fn(),
    getAgentHookRuntimeStatus: vi.fn(),
    isAgentHookRunning: vi.fn().mockReturnValue(false),
    listAgentHooks: vi.fn(),
    sendAgentUiRpc: vi.fn(),
    setAgentCopyToClipboard: vi.fn(),
    setAgentFlushDelayMs: vi.fn(),
    showAgentScriptUi: vi.fn(),
    startAgentHookSession: vi.fn(),
    stopAgentHookSession: vi.fn(),
}));

vi.mock('./detached_agent_client.js', () => ({
    callDetachedAgentUiRpc: vi.fn(),
    configureDetachedAgentCallbacks: vi.fn(),
    getDetachedAgentHookRuntimeStatus: vi.fn(),
    isDetachedAgentHookRunning: vi.fn().mockReturnValue(false),
    listDetachedAgentHooks: vi.fn(),
    reconnectDetachedAgentHookSession: vi.fn().mockResolvedValue(undefined),
    sendDetachedAgentUiRpc: vi.fn(),
    setDetachedAgentCopyToClipboard: vi.fn(),
    setDetachedAgentFlushDelayMs: vi.fn(),
    setDetachedAgentMaxBufferSize: vi.fn(),
    showDetachedAgentScriptUi: vi.fn(),
    shutdownDetachedAgentHostForUpdate: vi.fn(),
    startDetachedAgentHookSession: vi.fn(),
    stopDetachedAgentHookSession: vi.fn(),
}));

describe('startHookSession on Linux', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCurrentScene.mockResolvedValue({ id: 'scene-1', name: 'Visual Novel' });
        mocks.getGameExePathForScene.mockReturnValue('C:\\Games\\VN\\vn.exe');
        mocks.resolveWineLaunch.mockReturnValue({
            linuxPid: 4321,
            winePrefix: '/pfx',
            launcherPath: '/usr/bin/wine',
            launcherKind: 'wine',
            env: {},
        });
        mocks.startWineFridaConnection.mockRejectedValue(new Error('stop here'));
    });

    it('uses the configured exe instead of a supplied window class', async () => {
        const { startHookSession } = await import('./texthook.js');

        const result = await startHookSession({ engine: 'agent', exeName: 'steam_app_123' });

        expect(result.success).toBe(false);
        expect(mocks.startWineFridaConnection).toHaveBeenCalledWith(
            expect.anything(),
            'vn.exe',
            expect.anything(),
            expect.anything(),
        );
    });
});
