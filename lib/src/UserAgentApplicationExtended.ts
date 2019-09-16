import {Configuration, UserAgentApplication} from "msal";

export class UserAgentApplicationExtended extends UserAgentApplication {
    public store = {};
    constructor(configuration: Configuration) {
        super(configuration);
        this.store = this.cacheStorage
    }
}
