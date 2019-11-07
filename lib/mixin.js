export const mixin = {
    data: function() {
        return {
            msal: (this.$msal) ? this.$msal.data : {}
        }
    },
    created: function() {
        this.$watch('$msal.data', (value) => { this.msal = value; }, { deep: true });
    }
};
