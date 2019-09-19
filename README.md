# vue-msal

#### Wrapper of [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js#readme) (*Microsoft Authentication Library*) for usage in Vue.

The vue-msal library enables client-side [vue](https://vuejs.org/) applications, running in a web browser, to authenticate users using [Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-overview) work and school accounts (AAD), Microsoft personal accounts (MSA) and social identity providers like Facebook, Google, LinkedIn, Microsoft accounts, etc. through [Azure AD B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview#identity-providers) service. It also enables your app to get tokens to access [Microsoft Cloud](https://www.microsoft.com/enterprise) services such as [Microsoft Graph](https://graph.microsoft.io/).

## Installation
Add `vue-msal` dependency using yarn or npm to your project.
```shell script
npm install vue-msal
or
yarn add vue-msal
```

#### Vue Usage
Use the plugin in your vue instance like this
```js
import msal from 'vue-msal'

Vue.use(msal, {
    auth: {
      clientId: '<YOUR CLIENT ID HERE>'
    }
});

new Vue({
  //... options
})
```

#### Nuxt Usage
Add a new javascript file like `msal.js` under `/plugins/` directory with the following content
```js
import Vue from 'vue'
import msal from 'vue-msal'

Vue.use(msal, {
    auth: {
      clientId: '<YOUR CLIENT ID HERE>'
    }
});
```
Then include it to the plugins array in `nuxt.config.js` like this
```js
export default {
    plugins: [
        //...
        '@/plugins/msal'
        //...
    ]
}
```

## Plugin usage
When the plugin is initialized it exposes its context to `vm.$msal` (where `vm` refers to the Vue's scope) so you can, for example, call the signIn method like this:
```js
new Vue({
    //...
    created() {
        if (!this.$msal.isAuthenticated()) {
            this.$msal.signIn();
        }
    }
});
```
#### List of functions
* `signIn()`: Start the sign-in process **manually** 
> :grey_exclamation: *Note: you can also start the process automatically **in case the user needs to be authorized in all pages** by setting the option `auth.requireAuthOnInitialize` to `true`. Check the [Auth Configuration Options](#auth-options-required) below for more details*
* `signOut()`: Sign out an authorized user
* `isAuthenticated()`: Returns `true` if the user has been authenticated and `false` otherwise.
> :grey_exclamation: *Note: This function should not be used for reactivity. In order to **watch** whether the user is authenticated or not you should use the [mixin](#mixin) data properties below.*
* `acquireToken()`: Acquire an access token manually.
> :grey_exclamation: *Note: This will also run automatically after the user's successful authentication using the default permissions defined in the `auth.scopes` property of the configuration options. You should however run this manually in case you want to get an access token with more permissions than the default, by adding the new request options as an argument, like this<br>
>`acquireToken({scopes: ["user.read", "another.permission"]})` <br>
>Check the [Request Configuration Options](#request-options) below for more details*
* `callMSGraph()`: Manually call ms graph API using the acquired access token.
> :grey_exclamation: *Note: You can also set this to run automatically after a successful authentication by setting `graph.callAfterInit` property to `true` in the [Graph Configuration Options](#graph-options)*
* `saveCustomData(key, data)`: You can use this function to add custom data to the selected cache location (set with `cache.cacheLocation` in  the [configuration options](#cache-options)), that will be automatically deleted when the user signs out or his access token expires. This should be used, for example, to store any user related data fetched from another API.
> :grey_exclamation: *Note: You can get this data **with reactivity** by watching the `msal.custom` property of the [mixin](#mixin)'s data object*

### Mixin
All user related data is exposed via a mixin in the `msal` data property so that you can have access to it like you would normally access any of the component's data properties **with reactivity**.
>  :exclamation: Notice that the dollar sign ($) is missing here. While `this.$msal` refers to the plugin's exposed object, `this.msal` refers to the mixin's data object. Be careful not to confuse these two.

So for example you can do this:

```html
<div id="demo">
    <div v-if="user">
        <div>Welcome {{user.name}}</div>
        <div>Your job title is {{user.jobTitle}}</div>
        <div><button @click="$msal.signOut()">logout</button></div>
    </div>
    <div v-else>
        Please sign-in
        <button @click="$msal.signIn()"></button>
    </div>
</div>

<script>
//Importing the mixin locally (omit the following line if you are using the 'framework.globalMixin' option
import { msalMixin } from 'vue-msal'; 

new Vue({
    el: '#demo',
    //Importing the mixin locally (omit the following line if you are using the 'framework.globalMixin' option
    mixins: [msalMixin],
    computed: {
        user() {
          let user = null;
          if (this.msal.isAuthenticated) { // Note that the dollar sign ($) is missing from this.msal
            user = {
              ...this.msal.user,
              ...this.msal.userDetails
            }
          }
          return user;
        }
    }
});
</script>
```
> :exclamation: *Note: In case you want to import the mixin **globally** instead of importing it to specific vue instances you can do so by simply setting the `framework.globalMixin` to `true` in the [Framework Configuration Options](#framework-options). This will automatically add the mixin to all vue instances so that you have out-of-the-box access to the msal object*

The properties provided in the `msal` data object are the following:
* `isAuthenticated`: Is `true` if the user has been successfully authenticated and `false` otherwise.
* `accessToken`: The authenticated user's access token
* `user`: The user's data provided as a response by the **authentication's** API call
* `userDetails`: The user's data provided as a response by the **MS graph** API call
* `custom`: Whatever data you have saved using the `saveCustomData(key, data)` function call. (Check the relevant section in the plugin's [function list](#list-of-functions) above for more details)

## General notes
### OAuth 2.0 and the Implicit Flow
Msal implements the [Implicit Grant Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-implicit-grant-flow), 
as defined by the OAuth 2.0 protocol and is [OpenID](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)
compliant.

Our goal is that the library abstracts enough of the protocol away so that you can get plug and play authentication, but it is important to know and understand the implicit flow from a security perspective. The implicit flow runs in the context of a web browser which cannot manage client secrets securely. It is optimized for single page apps and has one less hop between client and server so tokens are returned directly to the browser. These aspects make it naturally less secure. These security concerns are mitigated per standard practices such as- use of short lived tokens (and so no refresh tokens are returned), the library requiring a registered redirect URI for the app, library matching the request 
and response with a unique nonce and state parameter.

> :exclamation: *Please check this [article](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-implicit-grant-flow#send-the-sign-in-request) for details on how to enable **implicit grant flow** for your project*

### Cache Storage

We offer two methods of storage for Msal, `localStorage` and `sessionStorage`. Our recommendation is to use `sessionStorage` because it is more secure in storing tokens that are acquired by your users, but `localStorage` will give you Single Sign On across tabs and user sessions. We encourage you to explore the options and make the best decision for your application.

## Configuration Options
Configuration options are organized into groups like this
```js
Vue.use(msal, {
    auth: { //Group
        clientId: '<YOUR CLIENT ID HERE>', //Option 1
        tenantId: '<YOUR TENANT ID HERE>', //Option 2
        //...
    },
    request: { //Group
        //...
    },
    cache: { //Group
        //...
    },
    system: { //Group
        //...
    },
    framework: { //Group
        //...
    },
});
```
#### `auth` options (***Required**)

Option | Type | Description
------ | ----------- | -----------
clientId | `string` | ***Required**. The clientID of your application, you should get this from the [application registration portal](https://go.microsoft.com/fwlink/?linkid=2083908).
tenantId | `string` | This is an identifier representing the sign-in audience. Can be:<br> `common`: - Used to sign in users with work and school accounts or a Microsoft personal account.<br> `organizations` - Used to sign in users with work and school accounts.<br> `consumers` - Used to sign in users with only personal Microsoft account (live)<br> or `<Tenant ID>` from Azure AD.<br>**Default**: `common`
tenantName | `string` | This is is the identity provider domain.<br>**Default**:`login.microsoftonline.com`
validateAuthority | `boolean` | Validate the issuer of tokens. For B2C applications, since the authority value is known and can be different per policy, the authority validation will not work and has to be set to false.<br> **Default**: `true`
redirectUri | `string` &#124; `(() => string)` | The redirect URI of your app, where authentication responses can be sent and received by your app. It must exactly match one of the redirect URIs you registered in the portal.<br> **Default**: `window.location.href`.
postLogoutRedirectUri | `string` &#124; `(() => string)` | Redirects the user to postLogoutRedirectUri after sign out.<br> **Default**: `redirectUri` *(the previous option)*
navigateToLoginRequestUrl | `boolean` | Ability to turn off default navigation to start page after login.<br> **Default**: `true`
requireAuthOnInitialize | `boolean` | Setting this to true will automatically require authentication right after the plugin has been initialized<br>**Default**: `false`
onAuthentication | `(ctx, error, response) => any` | Callback function to be executed after authentication request.<br> Function's arguments are: <br> `ctx` - the msal class's context (vm.$msal)<br> `error` - request error (=`null` if request was successful)<br> `response` - request's result (=`null` if request was unsuccessful)
onToken | `(ctx, error, response) => any` | Callback function to be executed after token request.<br> Function's arguments are: <br> `ctx` - the msal class's context (vm.$msal)<br> `error` - request error (=`null` if request was successful)<br> `response` - request's result (=`null` if request was unsuccessful)
beforeSignOut | `(ctx) => any` | Callback function to be executed before manual sign out.<br> Function's arguments are: <br> `ctx` - the msal class's context (vm.$msal)

#### `request` options

Option | Type | Description
------ | ----------- | -----------
scopes | `string[]` | An array of strings representing the scopes that will be used for the **Sign In** request and the default **Acquire Token** request<br>Default: `["user.read"]`

#### `graph` options

Option | Type | Description
------ | ----------- | -----------
callAfterInit | `boolean` | Setting this to `true` will automatically call `vm.$msal.callMSGraph()` once the user has been authenticated.<br> **Default**: `false`
meEndpoint | `string` | The API endpoint to be used for fetching the Graph data.<br>**Default**: `https://graph.microsoft.com/v1.0/me`
onResponse | `(ctx, response) => any` | Callback function called when a response has been received from the graph call. Function's arguments are: <br> `ctx` - the msal class's context (vm.$msal)<br> `response` - the  graph call's response

#### `cache` options

Option | Type | Description
------ | ----------- | -----------
cacheLocation | `"localStorage"` &#124; `"sessionStorage"` | Sets browser storage to either `localStorage` or `sessionStorage`.<br> **Default**: `localstorage`
storeAuthStateInCookie | boolean | This flag was introduced in MSAL.js v0.2.2 as a fix for the [authentication loop issues](https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/Known-issues-on-IE-and-Edge-Browser#1-issues-due-to-security-zones) on Microsoft Internet Explorer and Microsoft Edge. Set this flag to `true` to take advantage of this fix. When this is enabled, MSAL.js will store the auth request state required for validation of the auth flows in the browser cookies.<br>**Default**: `true` 

#### `system` options

Option | Type | Description
------ | ----------- | -----------
logger | **Logger** object | A Logger object with a callback instance that can be provided by the developer to consume and publish logs in a custom manner. For details on passing logger object, see [logging with msal.js](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-logging).
loadFrameTimeout | number | The number of milliseconds of inactivity before a token renewal response from Azure AD should be considered timed out.<br> **Default**: `6000`.
tokenRenewalOffsetSeconds | number | The number of milliseconds which sets the window of offset needed to renew the token before expiry.<br> **Default**: `300`.

#### `framework` options

Option | Type | Description
------ | ----------- | -----------
globalMixin | `boolean` | Setting this to `true` will add a mixin with the `msal` data object to **ALL** vue instances. Check the [Mixin](#mixin) section for more information <br> **Default**: `false`

## License

[MIT License](./LICENSE)

Copyright (c) Marios Vertopoulos
