 
import { readFileSync } from "fs";
import Path = require("path");
import {grpcStart} from "./server"
import {config} from "dotenv"

config();

const PORT: any = process.env.PORT || 10009;
const LISTEN_ADDR = process.env.LISTEN_ADDR || "0.0.0.0";
const NETWORK = process.env.NETWORK || "testnet"
const CLIGHTNING_DIR = process.env.CLIGHTNING_DIR || (process.env.HOME || process.env.USERPROFILE)+"/.lightning";
const LNDADAPTER_DIR = process.env.LNDADAPTER_DIR || (process.env.HOME || process.env.USERPROFILE)+"/.lnd-adapter";
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || Path.join(LNDADAPTER_DIR,"tls.key");
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || Path.join(LNDADAPTER_DIR,"tls.cert");




grpcStart(CLIGHTNING_DIR,NETWORK,LISTEN_ADDR,PORT,[{
    cert_chain:readFileSync(TLS_CERT_PATH),
    private_key:readFileSync(TLS_KEY_PATH)
}]);

