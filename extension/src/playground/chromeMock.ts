// Mock Chrome Extension APIs for the Web Simulator/Playground
// This allows the actual Sidebar and content script logic to run unmodified in standard browsers.

type MessageListener = (message: any, sender: any, sendResponse: (response: any) => void) => void | boolean;

class ChromeMockManager {
  private listeners: MessageListener[] = [];
  private mockStorage: Record<string, any> = {};

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    try {
      this.mockStorage.userProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
      this.mockStorage.applyHistory = JSON.parse(localStorage.getItem('applyHistory') || 'null');
    } catch (e) {
      console.error("Failed to initialize mock storage from localStorage:", e);
    }
  }

  // Registers runtime message listener
  public addListener(listener: MessageListener) {
    this.listeners.push(listener);
    console.log("[ChromeMock] Message listener registered. Total listeners:", this.listeners.length);
  }

  // Sends runtime message to all registered listeners (simulating content script port)
  public sendMessage(message: any, callback?: (response: any) => void) {
    console.log("[ChromeMock] Sending message:", message);
    let handled = false;

    this.listeners.forEach(listener => {
      try {
        const result = listener(message, { id: "mock-sender" }, (response) => {
          if (callback) {
            callback(response);
          }
        });
        if (result === true) {
          handled = true;
        }
      } catch (err) {
        console.error("[ChromeMock] Error in message listener:", err);
      }
    });

    // If no listener returned true (async), callback might be triggered synchronously
    if (!handled && callback) {
      // Small timeout to simulate async behavior
      setTimeout(() => {
        // Fallback response if not handled
      }, 50);
    }
  }

  // Storage Mock Methods
  public getStorage(keys: string[], callback: (result: any) => void) {
    const result: Record<string, any> = {};
    keys.forEach(key => {
      result[key] = this.mockStorage[key];
    });
    setTimeout(() => callback(result), 20);
  }

  public setStorage(data: Record<string, any>, callback?: () => void) {
    Object.assign(this.mockStorage, data);
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
    if (callback) {
      setTimeout(callback, 20);
    }
  }
}

const mockManager = new ChromeMockManager();

export const setupChromeMock = () => {
  if (typeof window === 'undefined') return;

  // Only setup if we are in a mockup/sandbox environment and chrome is not already defined
  if (!(window as any).chrome || !(window as any).chrome.runtime) {
    console.log("[ApplyPilot] Initializing high-fidelity Chrome Extension API Mocking...");

    (window as any).chrome = {
      runtime: {
        lastError: null,
        onMessage: {
          addListener: (listener: MessageListener) => {
            mockManager.addListener(listener);
          }
        }
      },
      storage: {
        local: {
          get: (keys: string[], callback: (result: any) => void) => {
            mockManager.getStorage(keys, callback);
          },
          set: (data: Record<string, any>, callback?: () => void) => {
            mockManager.setStorage(data, callback);
          }
        }
      },
      tabs: {
        query: (queryInfo: any, callback: (tabs: any[]) => void) => {
          // Return a mock tab representing our simulation view
          callback([{ id: 88, active: true, title: "ApplyPilot Job Application Simulator" }]);
        },
        sendMessage: (tabId: number, message: any, callback?: (response: any) => void) => {
          mockManager.sendMessage(message, callback);
        }
      }
    };
  }
};
