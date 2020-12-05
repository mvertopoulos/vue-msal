# vue-msal

#### Wrapper of [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js#readme) (*Microsoft Authentication Library*) for usage in Vue.

The vue-msal library enables client-side [vue](https://vuejs.org/) applications, running in a web browser, to authenticate users using [Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-overview) work and school accounts (AAD), Microsoft personal accounts (MSA) and social identity providers like Facebook, Google, LinkedIn, Microsoft accounts, etc. through [Azure AD B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview#identity-providers) service. It also enables your app to access [Microsoft Cloud](https://www.microsoft.com/enterprise) services such as [Microsoft Graph](https://graph.microsoft.io/).

## Installation
Add the `vue-msal` dependency to your project using yarn or npm.
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
  //... vue options
})
```

#### Nuxt Usage
Add a new javascript file like `msal.js` under `/plugins/` directory with the following content
> :grey_exclamation: *Note: you should add Vue as a second argument to the constructor if you want to add the global mixin automatically with the `framework.globalMixin` option. Check the [mixin](#mixin) section below for more information*
```js
import Vue from 'vue' //import Vue if you want to use the framework.globalMixin option
import MSAL from 'vue-msal'

export default ({ app, error, $axios }, inject) => {
  inject('msal', new MSAL(
    {
      auth: {
        clientId: '<YOUR CLIENT ID HERE>'
      }
    }, Vue /* [optional] should be passed as an argument if you want to the framework.globalMixin option*/
  ))
}

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
This will make the `$msal` object available in both the vue instances and the [context](https://nuxtjs.org/api/context/). For example you can access it in the context of a [middleware](https://nuxtjs.org/api/pages-middleware/) via the app object like this:
```js
export default function ({ app, route, error }) {
  // If the user is not authenticated and he's not in the /login page throw Error
  if (!app.$msal.isAuthenticated() && route.name !== 'login') {
    error({ statusCode: 401, message: 'Unauthorized' });
  }
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
> :grey_exclamation: *Note: you can also start the process automatically **in case the user needs to be authorized in all pages** by setting the option `auth.requireAuthOnInitialize` to `true`. Check the [Auth Configuration Options](#auth-options--required-) below for more details*
* `signOut()`: Sign out an authorized user
* `isAuthenticated()`: Returns `true` if the user has been authenticated and `false` otherwise.
> :grey_exclamation: *Note: This function should not be used for reactivity. In order to **watch** whether the user is authenticated or not you should use the [mixin](#mixin) data properties below.*
* `acquireToken([request[,retries[,storeToken]]])`: Acquire an access token manually.
> :grey_exclamation: *Note: This will also run automatically after the user's successful authentication using the default permissions defined in the `auth.scopes` property of the configuration options. You should however run this manually in case you want to get an access token with more permissions than the default, by adding the new request options as an argument, like this<br>
>`acquireToken({scopes: ["user.read", "another.permission"]})` <br>
>Check the [Request Configuration Options](#request-options) below for more details*.<br>
>You can also pass in a second parameter, with a number of retries in case of an **unexpected** failure (i.e. network errors).
>The third parameter is a boolean and instructs the library whether to store the token in the $msal object or to simply pass the token back. This defaults to true and allows for token retrieval for non Graph API's protected by AzureAD bearer tokens without requiring to request another token for Graph scopes after use.
* `msGraph(endpoints[,batchUrl])`: Manually call the MS Graph API using the acquired access token.
> :grey_exclamation: *Note: Read the [Calling MS Graph](#calling-ms-graph) section for more details*
* `saveCustomData(key, data)`: You can use this function to add custom data to the selected cache location (set with `cache.cacheLocation` in  the [configuration options](#cache-options)), that will be automatically deleted when the user signs out or his access token expires. This should be used, for example, to store any user related data fetched from another API.
> :grey_exclamation: *Note: You can read this data **without reactivity** from the [data object](#the-data-object) or **with reactivity** by watching the `msal.custom` property of the [mixin](#mixin)'s data object*

### The data object
You can access the data object that contains all of the user related data using the `$msal.data` object which is available in [nuxt's context](https://nuxtjs.org/api/context/). However in case you want reactivity for this data, it is recomended that you use the [mixin](#mixin) method below.

The properties provided in the data object are the following:
* `isAuthenticated`: Is `true` if the user has been successfully authenticated and `false` otherwise.
* `accessToken`: The authenticated user's **access** token. Read [below](#using-accesstoken-vs-idtoken) for information on usage.
* `idToken`: The authenticated user's **id** token. Read [below](#using-accesstoken-vs-idtoken) for information on usage.
* `user`: The user's data provided as a response by the **authentication's** API call
* `graph`: The data provided as a response by the **MS Graph API** call that runs on initialization when the `graph.callAfterInit` option is set to true. Check the [Calling MS Graph](#calling-ms-graph) section for more details 
* `custom`: Whatever data you have saved using the `saveCustomData(key, data)` function call. (Check the relevant section in the plugin's [function list](#list-of-functions) above for more details)

#### Using `accessToken` vs `idToken`

* `accessToken`: This token is not validatable outside of *MS Graph API* and therefore can only be used for MS Graph calls.
* `idToken`: This token is validatable and can be used for authentication / authorization with exteral APIs.

#### Mixin
All user related data can be exposed via a mixin in the `msal` data property so that you can have access to it like you would normally access any of the component's data properties **with reactivity**.
>  :exclamation: Notice that the dollar sign ($) is missing here. While `this.$msal` refers to the plugin's exposed object, `this.msal` refers to the mixin's data object. Be careful not to confuse these two.

So for example you can do this:

```html
<div id="demo">
    <div v-if="user">
        <div>Welcome {{user.name}}</div>
        <div v-if="user.profile.jobTitle">Your job title is {{user.profile.jobTitle}}</div>
        <div><button @click="$msal.signOut()">logout</button></div>
    </div>
    <div v-else>
        Please sign-in
        <button @click="$msal.signIn()"></button>
    </div>
</div>

<script>
//Importing the mixin locally (omit the following line if you are using the 'framework.globalMixin' option)
import { msalMixin } from 'vue-msal'; 

new Vue({
    el: '#demo',
    //Importing the mixin locally (omit the following line if you are using the 'framework.globalMixin' option)
    mixins: [msalMixin],
    computed: {
        user() {
          let user = null;
          if (this.msal.isAuthenticated) { // Note that the dollar sign ($) is missing from this.msal
            user = {
              ...this.msal.user,
              profile: {}
            }
            if (this.msal.graph && this.msal.graph.profile) {
                user.profile = this.msal.graph.profile
            }
          }
          return user;
        }
    }
});
</script>
```
> :exclamation: *Note: In case you want to import the mixin **globally** instead of importing it to specific vue instances you can do so by simply setting the `framework.globalMixin` to `true` in the [Framework Configuration Options](#framework-options). This will automatically add the mixin to all vue instances so that you have out-of-the-box access to the msal object. In nuxt you must also add the Vue object as an argument to the plugin's initialization for this to work. Check the [nuxt usage](#nuxt-usage) section for details.*

## Calling MS Graph
You can directly call the [MS Graph API](https://docs.microsoft.com/en-us/graph/overview) for a logged-in user, with the following methods.

#### Manually calling the MS Graph
In order to manually call the MS Graph API you can use the `$msal.msGraph(endpoints[,batchUrl])` function that will automatically use the access token set for the logged in user.

This function receives the following arguments:
* `endpoints`: **[required]** This can be either a **single value for a single request to the API**, or an **array of values for a [batch request](https://docs.microsoft.com/en-us/graph/json-batching) to the API**. Each value can be either:
   * An `object` containing the following properties:
     * `url`: **[required]** This can either be:
       * **A Full URL** (starting with *'http...'*) in case of a **single** request (this is invalid for batch requests)
       * **The URI part** (i.e. */me*), which **must** be used for **batch** requests but can also be used for single requests (in which case the full URL will be composed using the value of `graph.baseUrl` option from the [Graph Configuration Options](#graph-options) as the **Base URL**).
     * `id`: [optional] setting this to a string will result to returning a keyed object instead of an array containing the responses of a **batch** request. *This property is ignored for **single** requests.*
     * Any other optional property from the [Axios Request Configuration](https://github.com/axios/axios#request-config)
   * A `string` containing only the url (following the same rules as the `url` property of the object type argument)
* `batchUrl`: [optional] using this argument you can set a custom URL for this batch call. If this is not set the `graph.baseUrl` option from the [Graph Configuration Options](#graph-options) will be used as the **Batch URL**. *This argument is ignored for **single** requests.*

The response of this call depends on the arguments passed to it.
* For a single request, it returns the response object (with properties: status, headers, body)
* For a batch request:
  * with an array of URIs passed as strings in the endpoints argument, it will return an array of response objects that match the URI's index.
  * with an array of objects containing an id, it will return an object keyed with those ids containing the response object.

Example usage:
```js
new Vue({
    //...
    async mounted() {
        let result;
        result = await app.$msal.msGraph('https://www.example.com/1.0/me');
        // Single request at: https://www.example.com/1.0/me
        // Returns: { status: <number>, headers: <object>, body: <object> }
        result = await app.$msal.msGraph('/me');
        // Single request at: graph.baseUrl + '/me'
        // Returns: { status: <number>, headers: <object>, body: <object> }
        await app.$msal.msGraph(['/me', '/me/messages']);
        // Batch request at: graph.baseUrl for endpoints '/me' & '/me/messages'
        // Returns: [
        //      { status: <number>, headers: <object>, body: <object> },
        //      { status: <number>, headers: <object>, body: <object> }
        // ]
        await app.$msal.msGraph(['/me', '/me/messages'], 'https://www.custom-msgraph-url.com');
        // Batch request at: 'https://www.custom-msgraph-url.com' for endpoints '/me' & '/me/messages'
        // Returns: [
        //      { status: <number>, headers: <object>, body: <object> },
        //      { status: <number>, headers: <object>, body: <object> }
        // ]
        await app.$msal.msGraph([{ url: '/me'}, { url: '/me/photo/$value', responseType: 'blob' }]);
        // Batch request at: graph.baseUrl for endpoints '/me' & '/me/photo/$value'
        // Returns: [
        //      { status: <number>, headers: <object>, body: <object> },
        //      { status: <number>, headers: <object>, body: <object> }
        // ]
        await app.$msal.msGraph([{ url: '/me', id: 'profile'}, { url: '/me/photo/$value', id: 'photo', responseType: 'blob' }]);
        // Batch request at: graph.baseUrl for endpoints '/me' & '/me/photo/$value'
        // Returns: {
        //      profile: { status: <number>, headers: <object>, body: <object> },
        //      photo: { status: <number>, headers: <object>, body: <object> }
        // }
        await app.$msal.msGraph(['/me', { url: '/me/photo/$value', id: 'photo', responseType: 'blob' }]);
        // Batch request at: graph.baseUrl in endpoints '/me' & '/me/photo/$value'
        // Returns: {
        //      0: { status: <number>, headers: <object>, body: <object> },
        //      photo: { status: <number>, headers: <object>, body: <object> }
        // }
    }
});
```

#### Automatically calling the MS Graph on initialization
You can also call the MS Graph API on initialization (in case the user is logged-in) by setting the `graph.callAfterInit` option to true in the [Graph Configuration Options](#graph-options). 

You can assign the endpoints to be called in an object with keys like this:
```js
{
    // Configuration options
    graph: {
      callAfterInit: true,
      endpoints: {
        // ...
        // 'key' : endpoint
        // ...
        profile: '/me',
        photo: { url: '/me/photo/$value', responseType: 'blob', force: true }
      }
    }
}
```
This will create an object with **the body** of each result assigned to its respective key. You can get the result in `vm.msal.graph` data object (using the [mixin](#mixin)) or in `vm.$msal.data.graph`. The results are also cached to the storage you have selected (see [cache options](#cache-options)) unless the `force` option has been set to true in an endpoint (see bellow).
The endpoints that can be passed as a value to that object can have any of the formats described in the [manual call](#manually-calling-the-ms-graph). However the object format can also have two extra properties:
* `batchUrl`: [optional] If this option is set to a URL string, the endpoint will be grouped with any other endpoints that have the same batchUrl and the actual call to the API will be a batch call. You can also set this to `'default'` (as a string) in which case it will be executed as a batch request to the URL set in `graph.baseUrl` option in [graph configuration](#graph-options);
* `force`: [optional] If this is set to `true`, the result of this endpoint will not be read from / written to the cache. All other endpoints that don't have this option set to true will be cached, but this will be executed on every initialization. You should use this option for any result that cannot be encoded to JSON (like a **blob** for example).

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
authority | `string` | Your application's authority URL. Check [this page](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-client-application-configuration#authority) for more details.
tenantId (legacy) | `string` | This is an identifier representing the sign-in audience. Can be:<br> `common`: - Used to sign in users with work and school accounts or a Microsoft personal account.<br> `organizations` - Used to sign in users with work and school accounts.<br> `consumers` - Used to sign in users with only personal Microsoft account (live)<br> or `<Tenant ID>` from Azure AD.<br>**Default**: `common` <br> :exclamation: This option is deprecated and will be removed in next major version. Please use the `authority` option above instead. You should replace `tenantId` and `tenantName` options by adding the `authority` option with value: <br> `https://{tenantName}/{tenantId}`
tenantName (legacy) | `string` | This is is the identity provider domain.<br>**Default**:`login.microsoftonline.com` <br> :exclamation: This option is deprecated and will be removed in next major version. Please use the `authority` option above instead. You should replace `tenantId` and `tenantName` options by adding the `authority` option with value: <br> `https://{tenantName}/{tenantId}`
validateAuthority | `boolean` | Validate the issuer of tokens. For B2C applications, since the authority value is known and can be different per policy, the authority validation will not work and has to be set to false.<br> **Default**: `true`
redirectUri | `string` &#124; `(() => string)` | The redirect URI of your app, where authentication responses can be sent and received by your app. It must exactly match one of the redirect URIs you registered in the portal.<br> **Default**: `window.location.href`.
postLogoutRedirectUri | `string` &#124; `(() => string)` | Redirects the user to postLogoutRedirectUri after sign out.<br> **Default**: `redirectUri` *(the previous option)*
navigateToLoginRequestUrl | `boolean` | Ability to turn off default navigation to start page after login.<br> **Default**: `true`
requireAuthOnInitialize | `boolean` | Setting this to true will automatically require authentication right after the plugin has been initialized<br>**Default**: `false`
autoRefreshToken | `boolean` | When a token expires (either the `idToken` or the `accessToken`), if this is set to:<br> `false` the plugin will set the relevant token to an empty string<br> `true` the plugin will automatically attempt to renew the token<br>:grey_exclamation: Note: Expiration time includes the `tokenRenewalOffsetSeconds` value set in [System Options](#system-options)<br>**Default**: `true`
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
endpoints | `object` | Please check the endpoint options in the [Automatically calling the MS Graph on initialization](#automatically-calling-the-ms-graph-on-initialization) section. <br>Default: `{profile: '/me'}`
baseUrl | `string` | The default URL to be used when no full URL is set in single requests or no batch URL is set in batch requests.<br> Default: `'https://graph.microsoft.com/v1.0'`
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
tokenRenewalOffsetSeconds | number | The number of milliseconds which sets the window of offset needed to renew the token before expiry.<br> **Default**: `300`. <br> :grey_exclamation: **Note:** Setting this number too high may result in `invalid_grant` errors (more info [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/reference-breaking-changes#looping-clients-will-be-interrupted))

#### `framework` options

Option | Type | Description
------ | ----------- | -----------
globalMixin | `boolean` | Setting this to `true` will add a mixin with the `msal` data object to **ALL** vue instances. Check the [Mixin](#mixin) section for more information <br> **Default**: `false`

## Major (breaking) changes
(2.x.x) to (3.x.x): Added timer for automatically changing the accessToken on expiration
 
(1.x.x) to (2.x.x): Changed the methods used for accessing the MS Graph API

## License

[MIT License](./LICENSE)

Copyright (c) Marios Vertopoulos
