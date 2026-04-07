import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from './apiUtils';

let socketInstance: Socket | null = null;
let currentTabId: string | null = null;
let tabAuthToken: string | null = null;
let tabUserId: string | null = null;
let tabUserData: any = null;

function generateTabId(): string {
  let tabId = sessionStorage.getItem('socket_tab_id');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('socket_tab_id', tabId);
  }
  return tabId;
}

/** One-time copy from legacy localStorage into this tab's session keys, then drop shared auth keys. */
function migrateLegacyAuthIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (!currentTabId) {
    currentTabId = generateTabId();
  }
  const tokenKey = `tab_auth_token_${currentTabId}`;
  if (sessionStorage.getItem(tokenKey)) {
    return;
  }
  const legacyToken = localStorage.getItem('auth_token');
  if (!legacyToken) {
    return;
  }
  sessionStorage.setItem(tokenKey, legacyToken);
  const legacyUser = localStorage.getItem('user');
  if (legacyUser) {
    try {
      const user = JSON.parse(legacyUser) as { id?: string; _id?: string };
      const id = user.id || user._id;
      if (id) {
        sessionStorage.setItem(`tab_user_id_${currentTabId}`, String(id));
        sessionStorage.setItem(`tab_user_data_${currentTabId}`, legacyUser);
      }
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}

function ensureTabSessionLoaded(): void {
  if (typeof window === 'undefined') return;
  if (!currentTabId) {
    currentTabId = generateTabId();
  }
  migrateLegacyAuthIfNeeded();
}

export function initSocketAuth(): Socket {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const apiUrl = getBackendUrl();
  currentTabId = generateTabId();

  socketInstance = io(apiUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socketInstance.on('connect', () => {
    const socketId = socketInstance?.id;
    console.log('✅ Socket connected:', socketId);
    
    if (currentTabId && tabAuthToken && tabUserId && socketInstance) {
      console.log('🔄 Auto-registering tab on reconnect:', { tabId: currentTabId, userId: tabUserId.substring(0, 10) + '...' });
      socketInstance.emit('register_tab', {
        tabId: currentTabId,
        userId: tabUserId,
        token: tabAuthToken,
      });
    } else {
      console.warn('⚠️ Cannot auto-register - missing data:', { 
        hasTabId: !!currentTabId, 
        hasToken: !!tabAuthToken, 
        hasUserId: !!tabUserId,
        hasSocket: !!socketInstance 
      });
    }
  });

  socketInstance.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socketInstance.on('tab_registered', (data: { success: boolean; tabId?: string; room?: string }) => {
    if (data.success) {
      console.log('✅ Tab registered with server:', data.tabId, '| Socket ID:', socketInstance?.id, '| Room:', data.room);
    } else {
      console.warn('⚠️ Tab registration failed:', data);
    }
  });

  socketInstance.on('auth_updated', (data: { success: boolean }) => {
    if (data.success) {
      console.log('✅ Auth updated on server');
    }
  });

  socketInstance.on('tab_auth', (data: { success: boolean; userId?: string; token?: string }) => {
    if (data.success && data.token && data.userId) {
      tabAuthToken = data.token;
      tabUserId = data.userId;
      console.log('✅ Tab auth received from server');
    }
  });

  return socketInstance;
}

export function registerTabAuth(userId: string, token: string, userData?: any): Promise<void> {
  return new Promise((resolve) => {
    if (!socketInstance) {
      initSocketAuth();
    }

    if (!currentTabId) {
      currentTabId = generateTabId();
    }
    
    tabAuthToken = token;
    tabUserId = userId;
    tabUserData = userData || null;
    
    sessionStorage.setItem(`tab_auth_token_${currentTabId}`, token);
    sessionStorage.setItem(`tab_user_id_${currentTabId}`, userId);
    if (userData) {
      sessionStorage.setItem(`tab_user_data_${currentTabId}`, JSON.stringify(userData));
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');

    if (socketInstance && socketInstance.connected && currentTabId) {
      socketInstance.emit('register_tab', {
        tabId: currentTabId,
        userId,
        token,
      });

      let timeoutId: NodeJS.Timeout | null = null;
      let handlerCleared = false;
      
      const handler = (data: { success: boolean; tabId?: string }) => {
        if (handlerCleared) return;
        handlerCleared = true;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        socketInstance?.off('tab_registered', handler);
        if (data.success) {
          console.log('✅ Tab registered:', currentTabId);
        }
        resolve();
      };
      
      socketInstance.on('tab_registered', handler);
      
      timeoutId = setTimeout(() => {
        if (!handlerCleared) {
          handlerCleared = true;
          socketInstance?.off('tab_registered', handler);
          resolve();
        }
      }, 5000);
    } else {
      const checkConnection = () => {
        if (socketInstance && socketInstance.connected && currentTabId) {
          socketInstance.emit('register_tab', {
            tabId: currentTabId,
            userId,
            token,
          });

          const handler = (data: { success: boolean; tabId?: string }) => {
            socketInstance?.off('tab_registered', handler);
            socketInstance?.off('connect', checkConnection);
            if (data.success) {
              console.log('✅ Tab registered after connection:', currentTabId);
            }
            resolve();
          };
          
          socketInstance.on('tab_registered', handler);
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      if (socketInstance) {
        socketInstance.on('connect', checkConnection);
        
        setTimeout(checkConnection, 100);
        
        setTimeout(() => {
          socketInstance?.off('connect', checkConnection);
          console.log('✅ Using sessionStorage auth (Socket.IO will register when connected)');
          resolve();
        }, 2000);
      } else {
        console.log('✅ Using sessionStorage auth');
        resolve();
      }
    }
  });
}

export function updateTabAuth(userId: string, token: string): void {
  if (!socketInstance || !socketInstance.connected) {
    initSocketAuth();
  }

  if (!currentTabId) {
    currentTabId = generateTabId();
  }
  tabAuthToken = token;
  tabUserId = userId;
  sessionStorage.setItem(`tab_auth_token_${currentTabId}`, token);
  sessionStorage.setItem(`tab_user_id_${currentTabId}`, userId);

  if (socketInstance) {
    socketInstance.emit('update_tab_auth', {
      userId,
      token,
    });
  }
}

export function getTabAuthToken(): string | null {
  ensureTabSessionLoaded();
  if (tabAuthToken) {
    return tabAuthToken;
  }

  if (currentTabId) {
    const token = sessionStorage.getItem(`tab_auth_token_${currentTabId}`);
    if (token) {
      tabAuthToken = token;
      return token;
    }
  }

  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('get_tab_auth');
  }

  return null;
}

export function getTabUserId(): string | null {
  if (tabUserId) {
    return tabUserId;
  }

  if (currentTabId) {
    const userId = sessionStorage.getItem(`tab_user_id_${currentTabId}`);
    if (userId) {
      tabUserId = userId;
      return userId;
    }
  }

  return null;
}

export function getTabUserData(): any | null {
  if (tabUserData) {
    return tabUserData;
  }

  if (currentTabId) {
    const userStr = sessionStorage.getItem(`tab_user_data_${currentTabId}`);
    if (userStr) {
      try {
        tabUserData = JSON.parse(userStr);
        return tabUserData;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }

  return null;
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    tabAuthToken = null;
    tabUserId = null;
    tabUserData = null;
  }
}

export function getAuthToken(): string | null {
  const socketToken = getTabAuthToken();
  if (socketToken) {
    return socketToken;
  }

  if (currentTabId) {
    const token = sessionStorage.getItem(`tab_auth_token_${currentTabId}`);
    if (token) {
      tabAuthToken = token;
      return token;
    }
  }

  return null;
}

export function getUserId(): string | null {
  ensureTabSessionLoaded();
  const socketUserId = getTabUserId();
  if (socketUserId) {
    return socketUserId;
  }

  if (currentTabId) {
    const userId = sessionStorage.getItem(`tab_user_id_${currentTabId}`);
    if (userId) {
      tabUserId = userId;
      return userId;
    }
  }

  return null;
}

export function getUserData(): any | null {
  ensureTabSessionLoaded();
  const socketUserData = getTabUserData();
  if (socketUserData) {
    return socketUserData;
  }

  if (currentTabId) {
    const userStr = sessionStorage.getItem(`tab_user_data_${currentTabId}`);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        tabUserData = user;
        return user;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }

  return null;
}

export async function ensureAuth(): Promise<{ token: string | null; userId: string | null; userData: any | null }> {
  initSocketAuth();

  if (!currentTabId) {
    currentTabId = generateTabId();
  }
  ensureTabSessionLoaded();

  const token = getAuthToken();
  const userId = getUserId();
  let userData = getUserData();
  
  if (!userData && userId && currentTabId) {
    const userDataStr = sessionStorage.getItem(`tab_user_data_${currentTabId}`);
    if (userDataStr) {
      try {
        userData = JSON.parse(userDataStr);
        tabUserData = userData;
      } catch (e) {
        console.error('Error parsing user data from sessionStorage:', e);
      }
    }
  }
  
  return { token, userId, userData };
}
