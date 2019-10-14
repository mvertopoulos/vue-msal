import {AuthError, AuthResponse} from "msal";
import {CacheOptions, SystemOptions} from "msal/lib-commonjs/Configuration";
import { AxiosRequestConfig } from "axios";

export type Auth = {
    clientId: string,
    tenantId?: string,
    tenantName?: string,
    validateAuthority?: boolean;
    redirectUri?: string | (() => string);
    postLogoutRedirectUri?: string | (() => string);
    navigateToLoginRequestUrl?: boolean;
    requireAuthOnInitialize?: boolean,
    onAuthentication: (ctx: object, error: AuthError, response: AuthResponse) => any
    onToken: (ctx: object, error: AuthError | null, response: AuthResponse | null) => any,
    beforeSignOut: (ctx: object) => any
}

export type Request = {
    scopes?: string[]
}

export type GraphDetailedObject = AxiosRequestConfig & {
    url: string,
    id?: string
}
export type GraphEndpoints = string | GraphDetailedObject | Array<string | GraphDetailedObject>
export type Graph = {
    callAfterInit?: boolean,
    baseUrl?: string,
    endpoints?: { [id: string]: string | GraphDetailedObject },
    onResponse?: (ctx: object, response: object) => any
}

export type AuthError = AuthError
export type AuthResponse = AuthResponse
export type CacheOptions = CacheOptions
export type SystemOptions = SystemOptions
export type FrameworkOptions = {
    globalMixin?: boolean
}

export type Options = {
    auth: Auth,
    request?: Request,
    graph?: Graph,
    cache?: CacheOptions,
    system?: SystemOptions,
    framework?: FrameworkOptions
}

export type DataObject = {
    isAuthenticated: boolean,
    accessToken: string,
    user: object,
    graph: object,
    custom: object
}

export type CallbackQueueObject = {
    id: string,
    callback: string,
    arguments: any[]
}

export interface MSALBasic {
    data: DataObject,
    signIn: () => void,
    signOut: () => Promise<any> | void,
    isAuthenticated: () => boolean,
    acquireToken: (request: Request) => Promise<string | boolean>,
    msGraph: (endpoints:  GraphEndpoints, batchUrl: string | undefined) => Promise<object>,
    saveCustomData: (key: string, data: any) => void
}

export type CategorizedGraphRequests = { singleRequests: GraphDetailedObject[], batchRequests: { [id:string]: GraphDetailedObject[] } }
