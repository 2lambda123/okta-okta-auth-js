/*!
 * Copyright (c) 2015-present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * 
 * See the License for the specific language governing permissions and limitations under the License.
 */


/* eslint-disable max-statements */
/* global window, localStorage, StorageEvent */

import { TokenManager } from '../../../lib/TokenManager';
import * as features from '../../../lib/features';
import tokens from '@okta/test.support/tokens';
import {
  SYNC_STORAGE_NAME
} from '../../../lib';

const Emitter = require('tiny-emitter');

/* global window, StorageEvent */

describe('cross tabs communication', () => {
  let sdkMock;
  let instance;
  let syncStorage, syncStorageMap;
  beforeEach(function() {
    jest.useFakeTimers();
    instance = null;
    const emitter = new Emitter();
    syncStorageMap = {};
    syncStorage = {
      getItem: jest.fn().mockImplementation((k) => syncStorageMap[k]),
      setItem: jest.fn().mockImplementation((k, v) => syncStorageMap[k] = v),
      removeItem: jest.fn().mockImplementation((k) => delete syncStorageMap[k]),
    };
    sdkMock = {
      options: {},
      storageManager: {
        getTokenStorage: jest.fn().mockReturnValue({
          getStorage: jest.fn().mockReturnValue({})
        }),
        getSyncStorage: jest.fn().mockReturnValue(syncStorage),
        getOptionsForSection: jest.fn().mockReturnValue({})
      },
      emitter
    };
    jest.spyOn(features, 'isIE11OrLess').mockReturnValue(false);
    jest.spyOn(features, 'isLocalhost').mockReturnValue(true);
  });
  afterEach(() => {
    jest.useRealTimers();
    if (instance) {
      instance.stop();
    }
  });

  function createInstance(options = null) {
    instance = new TokenManager(sdkMock, options);
    instance.start();
    return instance;
  }

  it('should emit events and reset timeouts when storage event happen with token storage key', () => {
    createInstance();
    instance.resetExpireEventTimeoutAll = jest.fn();
    instance.emitEventsForCrossTabsStorageUpdate = jest.fn();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'okta-token-storage', 
      newValue: 'fake_new_value',
      oldValue: 'fake_old_value'
    }));
    jest.runAllTimers();
    expect(instance.resetExpireEventTimeoutAll).toHaveBeenCalled();
    expect(instance.emitEventsForCrossTabsStorageUpdate).toHaveBeenCalledWith('fake_new_value', 'fake_old_value');
  });
  it('should set options._storageEventDelay default to 1000 in isIE11OrLess env', () => {
    jest.spyOn(features, 'isIE11OrLess').mockReturnValue(true);
    createInstance();
    expect(instance.getOptions()._storageEventDelay).toBe(1000);
  });
  it('should use options._storageEventDelay from passed options', () => {
    createInstance({ _storageEventDelay: 100 });
    expect(instance.getOptions()._storageEventDelay).toBe(100);
  });
  it('should use options._storageEventDelay from passed options in isIE11OrLess env', () => {
    jest.spyOn(features, 'isIE11OrLess').mockReturnValue(true);
    createInstance({ _storageEventDelay: 100 });
    expect(instance.getOptions()._storageEventDelay).toBe(100);
  });
  it('should handle storage change based on _storageEventDelay option', () => {
    jest.spyOn(window, 'setTimeout');
    createInstance({ _storageEventDelay: 500 });
    instance.resetExpireEventTimeoutAll = jest.fn();
    instance.emitEventsForCrossTabsStorageUpdate = jest.fn();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'okta-token-storage', 
      newValue: 'fake_new_value',
      oldValue: 'fake_old_value'
    }));
    expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
    jest.runAllTimers();
    expect(instance.resetExpireEventTimeoutAll).toHaveBeenCalled();
    expect(instance.emitEventsForCrossTabsStorageUpdate).toHaveBeenCalledWith('fake_new_value', 'fake_old_value');
  });
  it('should emit events and reset timeouts when localStorage.clear() has been called from other tabs', () => {
    createInstance();
    instance.resetExpireEventTimeoutAll = jest.fn();
    instance.emitEventsForCrossTabsStorageUpdate = jest.fn();
    // simulate localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', {
      key: null,
      newValue: null,
      oldValue: null
    }));
    jest.runAllTimers();
    expect(instance.resetExpireEventTimeoutAll).toHaveBeenCalled();
    expect(instance.emitEventsForCrossTabsStorageUpdate).toHaveBeenCalledWith(null, null);
  });
  it('should not call localStorage.setItem when token storage changed', () => {
    createInstance();
    // https://github.com/facebook/jest/issues/6798#issuecomment-440988627
    jest.spyOn(window.localStorage.__proto__, 'setItem');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'okta-token-storage', 
      newValue: 'fake_new_value',
      oldValue: 'fake_old_value'
    }));
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
  it('should not emit events or reset timeouts if the key is not token storage key', () => {
    createInstance();
    instance.resetExpireEventTimeoutAll = jest.fn();
    instance.emitEventsForCrossTabsStorageUpdate = jest.fn();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'fake-key', 
      newValue: 'fake_new_value',
      oldValue: 'fake_old_value'
    }));
    expect(instance.resetExpireEventTimeoutAll).not.toHaveBeenCalled();
    expect(instance.emitEventsForCrossTabsStorageUpdate).not.toHaveBeenCalled();
  });
  it('should not emit events or reset timeouts if oldValue === newValue', () => {
    createInstance();
    instance.resetExpireEventTimeoutAll = jest.fn();
    instance.emitEventsForCrossTabsStorageUpdate = jest.fn();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'okta-token-storage', 
      newValue: 'fake_unchanged_value',
      oldValue: 'fake_unchanged_value'
    }));
    expect(instance.resetExpireEventTimeoutAll).not.toHaveBeenCalled();
    expect(instance.emitEventsForCrossTabsStorageUpdate).not.toHaveBeenCalled();
  });
  
  describe('_emitEventsForCrossTabsStorageUpdate', () => {
    it('should emit "added" event if new token is added', () => {
      createInstance();
      const newValue = '{"idToken": "fake-idToken"}';
      const oldValue = null;
      jest.spyOn(sdkMock.emitter, 'emit');
      instance.emitEventsForCrossTabsStorageUpdate(newValue, oldValue);
      expect(sdkMock.emitter.emit).toHaveBeenCalledWith('added', 'idToken', 'fake-idToken');
    });
    it('should emit "added" event if token is changed', () => {
      createInstance();
      const newValue = '{"idToken": "fake-idToken"}';
      const oldValue = '{"idToken": "old-fake-idToken"}';
      jest.spyOn(sdkMock.emitter, 'emit');
      instance.emitEventsForCrossTabsStorageUpdate(newValue, oldValue);
      expect(sdkMock.emitter.emit).toHaveBeenCalledWith('added', 'idToken', 'fake-idToken');
    });
    it('should emit two "added" event if two token are added', () => {
      createInstance();
      const newValue = '{"idToken": "fake-idToken", "accessToken": "fake-accessToken"}';
      const oldValue = null;
      jest.spyOn(sdkMock.emitter, 'emit');
      instance.emitEventsForCrossTabsStorageUpdate(newValue, oldValue);
      expect(sdkMock.emitter.emit).toHaveBeenNthCalledWith(1, 'added', 'idToken', 'fake-idToken');
      expect(sdkMock.emitter.emit).toHaveBeenNthCalledWith(2, 'added', 'accessToken', 'fake-accessToken');
    });
    it('should not emit "added" event if oldToken equal to newToken', () => {
      createInstance();
      const newValue = '{"idToken": "fake-idToken"}';
      const oldValue = '{"idToken": "fake-idToken"}';
      jest.spyOn(sdkMock.emitter, 'emit');
      instance.emitEventsForCrossTabsStorageUpdate(newValue, oldValue);
      expect(sdkMock.emitter.emit).not.toHaveBeenCalled();
    });
    it('should emit "removed" event if token is removed', () => {
      createInstance();
      const newValue = null;
      const oldValue = '{"idToken": "old-fake-idToken"}';
      jest.spyOn(sdkMock.emitter, 'emit');
      instance.emitEventsForCrossTabsStorageUpdate(newValue, oldValue);
      expect(sdkMock.emitter.emit).toHaveBeenCalledWith('removed', 'idToken', 'old-fake-idToken');
    });
    it('should emit two "removed" event if two token are removed', () => {
      createInstance();
      const newValue = null;
      const oldValue = '{"idToken": "fake-idToken", "accessToken": "fake-accessToken"}';
      jest.spyOn(sdkMock.emitter, 'emit');
      instance.emitEventsForCrossTabsStorageUpdate(newValue, oldValue);
      expect(sdkMock.emitter.emit).toHaveBeenNthCalledWith(1, 'removed', 'idToken', 'fake-idToken');
      expect(sdkMock.emitter.emit).toHaveBeenNthCalledWith(2, 'removed', 'accessToken', 'fake-accessToken');
    });
  });
});

describe('cross tabs renew', () => {
  let testContext;
  // syncStorage is shared (simulate LocalStorage which is shared across tabs)
  let syncStorageMap = {};
  let sharedTokenMap = {};
  const syncStorage = {
    getItem: jest.fn().mockImplementation((k) => syncStorageMap[k]),
    setItem: jest.fn().mockImplementation((k, v) => {
      const oldValue = JSON.stringify(syncStorageMap);
      syncStorageMap[k] = v;
      const newValue = JSON.stringify(syncStorageMap);
      console.log('eeeeee  set', {
        key: SYNC_STORAGE_NAME, 
        newValue,
        oldValue,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: SYNC_STORAGE_NAME, 
          newValue,
          oldValue,
        }));
      }
    }),
    removeItem: jest.fn().mockImplementation((k) => {
      const oldValue = JSON.stringify(syncStorageMap);
      delete syncStorageMap[k];
      const newValue = JSON.stringify(syncStorageMap);
      console.log('eeeeee  remove', {
        key: SYNC_STORAGE_NAME, 
        newValue,
        oldValue,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: SYNC_STORAGE_NAME, 
          newValue,
          oldValue,
        }));
      }
    }),
  };
  const sharedTokenStorage = {
    getStorage: jest.fn().mockImplementation(() => sharedTokenMap),
    setStorage: jest.fn().mockImplementation((v) => { sharedTokenMap = v; })
  };

  const createContext = (tokenStorage?) => {
    let testContext;

    const emitter = new Emitter();
    if (!tokenStorage) {
      tokenStorage = {
          getStorage: jest.fn().mockImplementation(() => testContext.storage),
          setStorage: jest.fn().mockImplementation(() => {})
      };
    }
    const sdkMock = {
      options: {},
      token: {
        renewTokens: jest.fn().mockImplementation(() => Promise.resolve(testContext.freshTokens))
      },
      storageManager: {
        getTokenStorage: jest.fn().mockReturnValue(tokenStorage),
        getSyncStorage: jest.fn().mockReturnValue(syncStorage),
      },
      emitter
    };

    const instance = new TokenManager(sdkMock as any, {
      _storageEventDelay: 0,
      // disable because we start service
      autoRenew: false,
      autoRemove: false
    });
    jest.spyOn(instance, 'setTokens');
    jest.spyOn(instance, 'remove').mockImplementation(() => {});
    jest.spyOn(instance, 'emitRenewed').mockImplementation(() => {});
    jest.spyOn(instance, 'emitError').mockImplementation(() => {});
    
    const storage = {
      idToken: tokens.standardIdTokenParsed
    };

    testContext = {
      sdkMock,
      tokenStorage,
      storage,
      instance,
      oldToken: tokens.standardIdTokenParsed,
      freshTokens: {
        idToken: tokens.standardIdToken2Parsed
      }
    };

    return testContext;
  };

  beforeEach(function() {
    syncStorageMap = {};
    sharedTokenMap = {};
    testContext = createContext();
  });


  it('works for 2 tabs', async () => {
    sharedTokenStorage.setStorage(testContext.storage);
    const tabs = [...Array(2)].map(_ => createContext(sharedTokenStorage));
    tabs.map(c => c.instance.start());

    const renewPromises = tabs.map(c => c.instance.renew('idToken'));
    const res = await Promise.allSettled(renewPromises);

    res.map(r => {
      expect(r.status).toBe('fulfilled');
      expect((r as any).value).toMatchObject(testContext.freshTokens.idToken);
    });
    
    const renewTokensCalls = tabs.map(c => c.sdkMock.token.renewTokens.mock.calls.length).reduce((v, c) => (c + v), 0);
    expect(renewTokensCalls).toEqual(1);

    tabs.map(c => c.instance.stop());
  });

});

