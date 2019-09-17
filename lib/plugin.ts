'use strict';
import {Options} from './src/types';
import { MSAL } from './src/main';
import { mixin } from "./mixin";
export const msalMixin = mixin;


export default {
    install: (Vue: any, options: Options) => {
        Vue.prototype.$msal = new MSAL(options);
        if (options.framework && options.framework.globalMixin) {
            Vue.mixin(mixin);
        }
    }
}
