const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('growBuddy', {
  getState: () => ipcRenderer.invoke('app:get-state'),
  openPanel: () => ipcRenderer.invoke('panel:open'),
  createGoal: (payload) => ipcRenderer.invoke('goal:create', payload),
  updateGoal: (payload) => ipcRenderer.invoke('goal:update', payload),
  activateGoal: (goalId) => ipcRenderer.invoke('goal:activate', goalId),
  deleteGoal: (goalId) => ipcRenderer.invoke('goal:delete', goalId),
  archiveGoal: (goalId) => ipcRenderer.invoke('goal:archive', goalId),
  extendGoal: (payload) => ipcRenderer.invoke('goal:extend', payload),
  addStep: (payload) => ipcRenderer.invoke('step:add', payload),
  updateStep: (payload) => ipcRenderer.invoke('step:update', payload),
  deleteStep: (eventId) => ipcRenderer.invoke('step:delete', eventId),
  updateSettings: (payload) => ipcRenderer.invoke('settings:update', payload),
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),
  updatePro: (payload) => ipcRenderer.invoke('pro:update', payload),
  proJoinShareCode: (code) => ipcRenderer.invoke('pro:join', code),
  proCreateShareCode: (goalId) => ipcRenderer.invoke('pro:create-share', goalId),
  proSyncNow: () => ipcRenderer.invoke('pro:sync-now'),
  onStateChange: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('state:snapshot', listener);
    return () => ipcRenderer.removeListener('state:snapshot', listener);
  },
  notifyRightClick: () => ipcRenderer.send('widget:right-click'),
  showPanelFromWidget: () => ipcRenderer.send('widget:toggle-panel')
});
