const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('growPet', {
  getState: () => ipcRenderer.invoke('app:get-state'),
  openPanel: () => ipcRenderer.invoke('panel:open'),
  createGoal: (payload) => ipcRenderer.invoke('goal:create', payload),
  updateGoal: (payload) => ipcRenderer.invoke('goal:update', payload),
  activateGoal: (goalId) => ipcRenderer.invoke('goal:activate', goalId),
  deleteGoal: (goalId) => ipcRenderer.invoke('goal:delete', goalId),
  addStep: (payload) => ipcRenderer.invoke('step:add', payload),
  updateStep: (payload) => ipcRenderer.invoke('step:update', payload),
  deleteStep: (eventId) => ipcRenderer.invoke('step:delete', eventId),
  updateSettings: (payload) => ipcRenderer.invoke('settings:update', payload),
  onStateChange: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('state:snapshot', listener);
    return () => ipcRenderer.removeListener('state:snapshot', listener);
  },
  notifyRightClick: () => ipcRenderer.send('widget:right-click'),
  showPanelFromWidget: () => ipcRenderer.send('widget:toggle-panel')
});
