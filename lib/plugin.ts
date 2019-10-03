'use strict';
import {Options} from './src/types';
import { MSAL } from './src/main';
import { mixin } from "./mixin";
export const msalMixin = mixin;

export default {
    install: (Vue: any, options: Options) => {
        const msal = new MSAL(options);
        Vue.prototype.$msal = {
            data: msal.data,
            signIn() { msal.signIn(); },
            async signOut() { await msal.signOut(); },
            isAuthenticated() { return msal.isAuthenticated(); },
            async acquireToken(request) { return await msal.acquireToken(request); },
            async callMSGraph() { await msal.callMSGraph(); },
            saveCustomData(key: string, data: any) { msal.saveCustomData(key, data); }
        };
        if (options.framework && options.framework.globalMixin) {
            Vue.mixin(mixin);
        }
    }
}
