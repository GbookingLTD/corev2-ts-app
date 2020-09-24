import {IMedMeJsonRpcEnv} from "corev2-ts-sdk/lib/jsonRpcEnv";


const env = {
    CORE_API_ENDPOINT: "http://localhost:3000/rpc",
    CRAC_SLOTS_API_ENDPOINT: "http://cracslots.dev.gbooking.ru/rpc",
    CRAC_API_ENDPOINT: "http://crac.dev.gbooking.ru/rpc",
    CRAC3_API_ENDPOINT: "http://crac.dev.gbooking.ru/rpc",
    OAUTH_OTP_SEND: "https://oauth2.dev.gbooking.ru/sms/code",
    OAUTH_OTP_VERIFY: "https://oauth2.dev.gbooking.ru/sms/verify",

    JSONRPC_REQUEST_DEBUG: true,
    OTP_REQUEST_DEBUG: true
} as IMedMeJsonRpcEnv;

export default env;