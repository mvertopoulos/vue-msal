import axios from "axios";
import _ from "lodash";
import { UserAgentApplicationExtended } from "./UserAgentApplicationExtended";
import {Auth, Request, Graph, CacheOptions, Options, DataObject, CallbackQueueObject, AuthError, AuthResponse, MSALBasic} from './types';

export class MSAL implements MSALBasic {
    private lib: any;
    public data: DataObject = {
        isAuthenticated: false,
        accessToken: '',
        user: {},
        userDetails: {},
        custom: {}
    };
    public callbackQueue: CallbackQueueObject[] = [];
    private readonly auth: Auth = {
        clientId: '',
        tenantId: 'common',
        tenantName: 'login.microsoftonline.com',
        redirectUri: window.location.href,
        postLogoutRedirectUri: window.location.href,
        navigateToLoginRequestUrl: true,
        requireAuthOnInitialize: false,
        onAuthentication: (error, response) => {},
        onToken: (error, response) => {},
        beforeSignOut: () => {}
    };
    private readonly cache: CacheOptions = {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true
    };
    private readonly request: Request = {
        scopes: ["user.read"]
    };
    private readonly graph: Graph = {
        callAfterInit: false,
        meEndpoint: "https://graph.microsoft.com/v1.0/me",
        onResponse: (response) => {}
    };
    constructor(private readonly options: Options) {
        if (!options.auth.clientId) {
            throw new Error('auth.clientId is required');
        }
        this.auth = Object.assign(this.auth, options.auth);
        this.cache = Object.assign(this.cache, options.cache);
        this.request = Object.assign(this.request, options.request);
        this.graph = Object.assign(this.graph, options.graph);

        this.lib = new UserAgentApplicationExtended({
            auth: {
                clientId: this.auth.clientId,
                authority: `https://${this.auth.tenantName}/${this.auth.tenantId}`,
                redirectUri: this.auth.redirectUri
            },
            cache: this.cache,
            system: options.system
        });

        this.getSavedCallbacks();
        this.executeCallbacks();
        // Register Callbacks for redirect flow
        this.lib.handleRedirectCallback((error: AuthError, response: AuthResponse) => {
            this.saveCallback('auth.onAuthentication', error, response);
        });
        this.lib.handleRedirectCallback((response: AuthResponse) => {
            this.saveCallback('auth.onToken', null, response);
        }, (error: AuthError) => {
            this.saveCallback('auth.onToken', error, null);
        });

        if(this.auth.requireAuthOnInitialize) {
            this.signIn()
        }
        this.data.isAuthenticated = this.isAuthenticated();
        if(this.data.isAuthenticated){
            this.data.user = this.lib.getAccount();
            this.acquireToken().then(() => {
                if(this.graph.callAfterInit) {
                    this.callMSGraph();
                }
            });
        }
        this.getStoredCustomData();
    }
    signIn() {
        if(!this.lib.isCallback(window.location.hash) && !this.lib.getAccount()){
            // request can be used for login or token request, however in more complex situations this can have diverging options
            this.lib.loginRedirect(this.request);
        }
    }
    async signOut() {
        if (this.options.auth.beforeSignOut) {
            await this.options.auth.beforeSignOut(this);
        }
        this.lib.logout();
    }
    isAuthenticated() {
        return !this.lib.isCallback(window.location.hash) && !!this.lib.getAccount();
    }
    async acquireToken(request = this.request) {
        try {
            //Always start with acquireTokenSilent to obtain a token in the signed in user from cache
            const { accessToken } = await this.lib.acquireTokenSilent(request);
            this.data.accessToken = accessToken;
            return accessToken;
        } catch (error) {
            // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
            // Call acquireTokenRedirect
            if (this.requiresInteraction(error.errorCode)) {
                this.lib.acquireTokenRedirect(request); //acquireTokenPopup
            }
            return false;
        }
    }
    private requiresInteraction(errorCode: string) {
        if (!errorCode || !errorCode.length) {
            return false;
        }
        return errorCode === "consent_required" ||
            errorCode === "interaction_required" ||
            errorCode === "login_required";
    }
    async callMSGraph() {
        const { onResponse: callback, meEndpoint } = this.graph;
        if (meEndpoint) {
            const storedData = this.lib.store.getItem(`msal.msgraph-${this.data.accessToken}`);
            if (storedData) {
                this.data.userDetails = JSON.parse(storedData);
            } else {
                try {
                    const response = await axios.get(meEndpoint, {
                        headers: {
                            Authorization: 'Bearer ' + this.data.accessToken
                        }
                    });
                    this.data.userDetails = response.data;
                    this.lib.store.setItem(`msal.msgraph-${this.data.accessToken}`, JSON.stringify(this.data.userDetails));
                } catch (error) {
                    console.log(error);
                    return;
                }
            }
            if (callback)
                this.saveCallback('graph.onResponse', this.data.userDetails);
        }
    }
    // CUSTOM DATA
    saveCustomData(key: string, data: any) {
        if (!this.data.custom.hasOwnProperty(key)) {
            this.data.custom[key] = null;
        }
        this.data.custom[key] = data;
        this.storeCustomData();
    }
    private storeCustomData() {
        if (!_.isEmpty(this.data.custom)) {
            this.lib.store.setItem('msal.custom', JSON.stringify(this.data.custom));
        } else {
            this.lib.store.removeItem('msal.custom');
        }
    }
    private getStoredCustomData() {
        let customData = {};
        const customDataStr = this.lib.store.getItem('msal.custom');
        if (customDataStr) {
            customData = JSON.parse(customDataStr);
        }
        this.data.custom = customData;
    }
    // CALLBACKS
    private saveCallback(callbackPath: string, ...args: any[]) {
        if (_.get(this.options, callbackPath)){
            const callbackQueueObject: CallbackQueueObject = {
                id: _.uniqueId(`cb-${callbackPath}`),
                callback: callbackPath,
                arguments: args
            };
            this.callbackQueue.push(callbackQueueObject);
            this.storeCallbackQueue();
            this.executeCallbacks([callbackQueueObject]);
        }
    }
    private getSavedCallbacks() {
        const callbackQueueStr = this.lib.store.getItem('msal.callbackqueue');
        if (callbackQueueStr) {
            this.callbackQueue = [...this.callbackQueue, ...JSON.parse(callbackQueueStr)];
        }
    }
    private async executeCallbacks(callbacksToExec: CallbackQueueObject[] = this.callbackQueue) {
        if (callbacksToExec.length) {
            for (let i in callbacksToExec) {
                const cb = callbacksToExec[i];
                const callback = _.get(this.options, cb.callback);
                try {
                    await callback(this, ...cb.arguments);
                    _.remove(this.callbackQueue, function(currentCb) {
                        return cb.id === currentCb.id;
                    });
                    this.storeCallbackQueue();
                } catch (e) {
                    console.warn(`Callback '${cb.id}' failed with error: `, e.message);
                }
            }
        }
    }
    private storeCallbackQueue() {
        if (this.callbackQueue.length) {
            this.lib.store.setItem('msal.callbackqueue', JSON.stringify(this.callbackQueue));
        } else {
            this.lib.store.removeItem('msal.callbackqueue');
        }
    }
}
