export const mixin = {
    data() {
        return {
            msal: this.$msal.data
        }
    },
    created() {
        this.$watch('$msal.data', (value) => { this.msal = value; }, { deep: true });
    }
};
