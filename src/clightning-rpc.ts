//const net = require('net')
import {createConnection} from 'net'
import {homedir, type} from 'os';

import { Block } from "bitcoinjs-lib";
import { number } from 'bitcoinjs-lib/types/script';

export namespace CLN{

const homedirPath = homedir();

//Promise Helper Function
const chainPromises = (funcs: any[], continueOnCatch = false) => {
    return funcs.reduce((promise, func) => {
        if(continueOnCatch) {
            return promise.then((result: string | any[]) => func().then((r: any) => result.concat(r)).catch((e: string) => result.concat(e)))
        } else {
            return promise.then((result: string | any[]) => func().then((r: any) => result.concat(r)))
        }
    }, Promise.resolve([]))
}
interface ErrorResponse {
    error: string;
    code: number;
}
export enum OnchainAddressType{
    bech32 = "bech32",
    p2sh_segwit = "p2sh-segwit",
    all = "all"
}
export interface OnchainNewAddressResponse{
    address?:string;
    bech32:string;
    "p2sh-segwit":string;
}

export interface Address{
    type:string;
    address:string;
    port:number;
}
interface AddressesResult{
    addresses:Address[]
}
interface NodeInfo {
    nodeid:string;
    alias:string;
    color:string;
    last_timestamp:number;
    features:string;
    addresses:Address[];
}
interface NodeInfoResult{
    nodes: NodeInfo[];
}
interface WithdrawResult{
    tx:string;
    txid:string;
}
interface WithdrawRequest{
    destination:string;
    satoshi:number|"all";
    feerate?:number;
    minconf?:number;
    utxos?:string[];
}


export interface Channel{
    source:string;
    destination:string;
    short_channel_id:string;
    public:boolean;
    satoshis:number;
    amount_msat:string;
    message_flags:number;
    channel_flags:number;
    active:boolean;
    last_update:number;
    base_fee_millisatoshi:number;
    fee_per_millionth:number;
    delay:number;
    htlc_minimum_msat:string;
    htlc_maximum_msat:string;
    features:string;
}

export interface ChannelsResult{
    channels:Channel[];
};

export interface ChannelLocal{
    state:"OPENINGD" | "CHANNELD_AWAITING_LOCKIN" | "CHANNELD_NORMAL" | "CHANNELD_SHUTTING_DOWN" | "CLOSINGD_SIGEXCHANGE" | "AWAITING_UNILATERAL" | "FUNDING_SPEND_SEEN" | "ONCHAIN" | "CLOSED";
    scratch_txid:string;
    owner:string;
    short_channel_id:string;
    direction:number;
    channel_id:string;
    funding_txid:string;
    close_to_addr:string;
    close_to:string;
    private:boolean;
    features:string[];
    funding_allocation_msat:{[key:string]:number}
    funding_msat:{[key:string]:string};
    msatoshi_to_us:number;
    to_us_msat:string;
    msatoshi_to_us_min:number;
    min_to_us_msat:string;
    msatoshi_to_us_max:number;
    max_to_us_msat:string;
    msatoshi_total:number;
    total_msat:string;
    dust_limit_satoshis:number;
    dust_limit_msat:string;
    max_htlc_value_in_flight_msat:number;
    max_total_htlc_in_msat:string;
    their_channel_reserve_satoshis:number;
    their_reserve_msat:string;
    our_channel_reserve_satoshis:number;
    our_reserve_msat:string;
    spendable_msatoshi:number;
    spendable_msat:string;
    receivable_msatoshi:number;
    receivable_msat:string;
    htlc_minimum_msat:number;
    minimum_htlc_in_msat:string;
    their_to_self_delay:number;
    our_to_self_delay:string;
    max_accepted_htlcs:number;
    status:string[];
    in_payments_offered:number;
    in_msatoshi_offered:number;
    in_offered_msat:string;
    in_payments_fulfilled:number;
    in_msatoshi_fulfilled:number;
    in_fulfilled_msat:string;
    out_payments_offered:number;
    out_msatoshi_offered:number;
    out_offered_msat:string;
    out_payments_fulfilled:number;
    out_msatoshi_fulfilled:number;
    out_fulfilled_msat:string;
    htlcs:string[];
}
interface PeerAddress{
    id: string,
    host:string;
    port:number
}
export interface Peer{
    id: string,
    connected:boolean;
    netaddr:string[];
    features:string;
    channels:ChannelLocal[];
}
interface PeerResult {
    peers:Array<Peer>
};

export interface Invoice{
    label:string;
    status:"unpaid"|"paid"|"expired";
    payment_hash:string;
    expiry_time:number;
    msatoshi?:number;
    amount_msat?:string;
    pay_index?:number;
    msatoshi_received?:number;
    amount_received_msat?:string;
};
interface InvoicesResult{
    invoices:Invoice[];
};
interface HelpResult{
    help:string
};
export type PaymentStatus = "complete"|"failed"|"pending";
export interface Payment{
    bolt11:string;
    payment_hash:string;
    status:PaymentStatus;
    payment_preimage:string;
    label:string;
    amount_sent_msat:string;
}
export interface PaymentPattern{
    bolt11:string|null, payment_hash:string|null;
}
interface PaymentsResult{
    payments:Payment[];
}

interface GetInfoResponse{
    id:string;
    alias:string;
    color:string;
    num_peers:number;
    num_pending_channels:number;
    num_active_channels:number;
    num_inactive_channels:number;
    address:Address[];
    binding:Address[];
    version:string;
    blockheight:number;
    network:string;
    msatoshi_fees_collected:number;
    fees_collected_msat:string;
    api_version:string
}
export interface UTXO{
    txid:string;
    output:number;
    value:number;
    amount_msat:string;
    scriptpubkey:string;
    address:string;
    status:string;
    blockheight:number;
    reserved:boolean;
}
export interface channelFundsState{
    peer_id:string;
    connected:boolean;
    state:string;
    short_channel_id:string;
    channel_sat:number;
    our_amount_msat:string;
    channel_total_sat:string;
    amount_msat:string;
    funding_txid:string;
    funding_output:number;
}
export interface listFundsResult{
    outputs:UTXO[];
    channels:channelFundsState[];
}
export interface transaction{
    hash:string;
    rawtx:string;
    blockheight:number;
    txindex:number;
    locktime:number;
    version:number;
    inputs:[{
        txid:string;
        index:number;
        sequence:number;
    }]
    outputs:[{
        index:number;
        satoshis:string;
        scriptPubKey:string;
    }]
}
export interface listTransactionsResult{
    transactions:transaction[];
}
export type forwardStatus = "offered"|"settled"|"failed"
export interface forward{
    in_channel:string;
    in_msatoshi:number;
    in_msat:string;
    status:forwardStatus;
    received_time:number;
    out_channel:string;
    fee:number;
    fee_msat:string;
    out_msatoshi:number;
    out_msat:string;
    payment_hash:string;
    resolved_time?:number;
}
export interface listForwardsResult{
    forwards:forward[]
}
export interface rawBlock{
    blockhash:string;
    block:string;
}
export interface blockHeader{
    hash: string;
    height: number;
    version: number;
    merkleroot: string;
    timestamp: number;
    nonce: number;
    bits: number;
    chainwork: string;
    nTx?: number;
    previousblockhash: string;
    witnessCommit:string;
}
export interface pluginConfig{
    name:string;
    path:string;
    options:object;
}
export interface config{
    "# version":string;
    "lightning-dir":string;
    network:string;
    "allow-deprecated-apis":boolean;
    "rpc-file":string;
    plugins:pluginConfig[]
    "important-plugins":pluginConfig[]
    "important-plugin":any;
    plugin:any;
    "disable-plugin":string[];
    "always-use-proxy":boolean;
    daemon:boolean;
    wallet:string;
    "large-channels":boolean;
    rgb:string;
    alias:string;
    "pid-file":string;
    "ignore-fee-limits":boolean;
    "watchtime-blocks":number;
    "max-locktime-blocks":number;
    "funding-confirms":number;
    "commit-fee-min":number;
    "commit-fee-max":number;
    "cltv-delta":number;
    "cltv-final":number;
    "fee-base":number;
    "fee-per-satoshi":number;
    "max-concurrent-htlcs":number;
    "min-capacity-sat":number;
    "bind-addr":string;
    "announce-addr":string;
    offline:boolean;
    autolisten:boolean;
    "enable-autotor-v2-mode":boolean;
    "encrypted-hsm":boolean;
    "rpc-file-mode":number;
    "log-level":string;
    "log-prefix":string;
}
interface bcliOption{
    "bitcoin-datadir"?:string;
    "bitcoin-cli"?:string;
    "bitcoin-rpcuser"?:string;
    "bitcoin-rpcpassword"?:string;
    "bitcoin-rpcconnect"?:string;
    "bitcoin-rpcport"?:string;
    "bitcoin-retry-timeout"?:string;
    "commit-fee"?:string;
}
export interface bitcoinConfig{
    rpcuser:string;
    rpcpassword:string;
    rpcconnect:string;
    rpcport:number;
    retryTimeout:number;
}

export function toHex(str:string) {
    var result = '';
    for (var i=0; i<str.length; i++) {
        result += str.charCodeAt(i).toString(16);
    }
    return result;
}
//Main Class
export class CLightningRPC {
    private rpcID:string;
    constructor(rpcID = homedirPath + '/.lightning/bitcoin/lightning-rpc') {
        this.rpcID = rpcID
    }

    public rpcRequest(command:string, params:object) {
        return new Promise((resolve, reject) => {
            var result = Buffer.alloc(0)
            const client = createConnection({path: this.rpcID})
            client.on("connect", () => {
                //console.debug("rpcRequest connect");
                const request = {
                    method: command,
                    params: params,
                    id: 0
                }
                client.write(JSON.stringify(request))
            })

            client.on("data", (data) => {
                result = Buffer.concat([result, data])
                let endRex = / ?}\n+/;
                //console.debug("rpcRequest data "+result);
                //console.debug("rpcRequest data "+toHex(result.slice(-3).toString()));
                if(result.slice(-3).toString() === ' }\n' || result.slice(-3).toString() === '}\n' || result.slice(-3).toString() === '}\n\n') {
                    try {
                        const resObj = JSON.parse(result.toString())
                        client.end()
                        //console.debug("rpcRequest end");
                        if (resObj.error) {
                            //console.debug("rpcRequest error");
                            reject(resObj.error)
                        }
                        else {
                            //console.debug("rpcRequest result");
                            resolve(resObj.result)
                        }                   
                    }
                    catch (err) {
                        //console.debug("rpcRequest err");
                        reject(err)
                    }
                }
            })

            client.on("error", (err:object) => {
                console.debug("rpcRequest on error");
                client.end()
                reject(err)
            })
        })
    }

    public listNodes() {
        return new Promise<NodeInfo[]>((resolve, reject) => {
            (this.rpcRequest('listnodes', {}) as Promise<NodeInfoResult>)
            .then((data) => {
                resolve(data.nodes)
            })
            .catch(reject)
        })
    }

    public getNode(id:string) {
        return new Promise<NodeInfo>((resolve, reject) => {
            (this.rpcRequest('listnodes', {id: id}) as Promise<NodeInfoResult>)
            .then((data) => {
                resolve(data.nodes[0])
            })
            .catch(reject)
        })
    }

    public connectToPeer(id:string, host?:string, port = 9735) {
        if (id.includes('@')) {
            const addr = id.split('@')
            id = addr[0]
            host = addr[1]
        }
        if (host && host.includes(':')) {
            port = parseInt(host.split(':')[1])
        }
        return new Promise<PeerAddress>((resolve,reject) => {
            (this.rpcRequest('connect', {
                id: id,
                host: host,
                port: port
            } as PeerAddress) as Promise<PeerAddress>)
            .then((data) => {
                resolve(data)
            })
            .catch((reason:ErrorResponse) =>{
                reject(reason);
            })
        })
    }

    public listPeers() {
        return new Promise<Peer[]>((resolve, reject) => {
            (this.rpcRequest('listpeers', {}) as Promise<PeerResult>)
            .then((data:PeerResult) => {
                resolve(data.peers)
            })
            .catch(reject)
        })
    }

    public getPeer(id:string) {
        return new Promise<Peer>((resolve, reject) => {

            (this.rpcRequest('listpeers', {
                id: id,
                level: null
            }) as Promise<PeerResult>)
            .then((data:PeerResult) => {
                resolve(data.peers[0])
            })
            .catch(reject)
        })
    }

    public getRoute(id:string, msatoshi:number, riskfactor = 0, cltv = 9) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('getroute', {
                id: id,
                msatoshi: msatoshi,
                riskfactor: riskfactor,
                cltv: cltv
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public listChannels() {
        return new Promise<Channel[]>((resolve, reject) => {
            (this.rpcRequest('listchannels', {}) as Promise<ChannelsResult>)
            .then((data:ChannelsResult) => {
                resolve(data.channels)
            })
            .catch(reject)
        })
    }
    public listChannelsByPeer(peerId:string) {
        return new Promise<Channel[]>((resolve, reject) => {
            (this.rpcRequest('listchannels', {
                source:peerId
            }) as Promise<ChannelsResult>)
            .then((data:ChannelsResult) => {
                resolve(data.channels)
            })
            .catch(reject)
        })
    }
    public getChannel(short_id:string) {
        return new Promise<Channel>((resolve, reject) => {
            (this.rpcRequest('listchannels', {
                short_channel_id: short_id
            })as Promise<ChannelsResult>)
            .then((data:ChannelsResult) => {
                resolve(data.channels[0])
            })
            .catch(reject)
        })
    }

    public createInvoice(msatoshi:string, label:string, description:string, expiry = null, fallbacks = null, preimage = null) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('invoice', {
                msatoshi: msatoshi,
                label: label,
                description: description,
                expiry: expiry,
                fallbacks: fallbacks,
                preimage: preimage
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public listInvoices() {
        return new Promise<Invoice[]>((resolve, reject) => {
            (this.rpcRequest('listinvoices', {
                label: null
            }) as Promise<InvoicesResult>)
            .then((data:InvoicesResult) => {
                resolve(data.invoices)
            })
            .catch(reject)
        })
    }

    public getInvoice(label:string) {
        return new Promise<Invoice>((resolve, reject) => {
            (this.rpcRequest('listinvoices', {
                label: label
            }) as Promise<InvoicesResult>)
            .then((data:InvoicesResult) => {
                resolve(data.invoices[0])
            })
            .catch(reject)
        })
    }

    public deleteInvoice(label:string, status = 'unpaid') {
        return new Promise((resolve, reject) => {
            this.rpcRequest('delinvoice', {
                label: label,
                status: status
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public waitAnyInvoice(lastpay_index = null) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('waitanyinvoice', {
                lastpay_index: lastpay_index
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public decodePay(bolt11:string, description = null) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('decodepay', {
                bolt11: bolt11,
                description: description
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public help() {
        return new Promise<string>((resolve, reject) => {
            (this.rpcRequest('help', {}) as Promise<HelpResult>)
            .then((data:HelpResult) => {
                resolve(data.help)
            })
            .catch(reject)
        })
    }

    public stop() {
        return new Promise((resolve, reject) => {
            this.rpcRequest('stop', {})
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public getLog(level = 'info') {
        return new Promise((resolve, reject) => {
            this.rpcRequest('getlog', {
                level: level
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public getInfo() {
        return new Promise<GetInfoResponse>((resolve, reject) => {
            (this.rpcRequest('getinfo', {}) as Promise<GetInfoResponse>)
            .then((data:GetInfoResponse) => {
                //console.debug("getInfo data");
                resolve(data)
            })
            .catch(reject)
        })
    }

    public sendPay(route:any, payment_hash:string) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('sendpay', {
                route: route,
                payment_hash: payment_hash
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public waitSendPay(payment_hash:string, timeout:any) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('waitsendpay', {
                payment_hash: payment_hash,
                timeout: timeout
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public pay(bolt11:string, msatoshi = null, description = null, riskfactor = null, maxfeepercent = null, retry_for = null, maxdelay = null) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('pay', {
                bolt11: bolt11,
                msatoshi: msatoshi,
                description: description,
                riskfactor: riskfactor,
                maxfeepercent: maxfeepercent,
                retry_for: retry_for,
                maxdelay: maxdelay
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public fundChannel(id:string, satoshi:any) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('fundchannel', {
                id: id,
                satoshi: satoshi
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public closeChannel(id:string, force = null, timeout = null) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('close', {
                id: id,
                force: force,
                timeout: timeout
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public withdraw(destination:string, satoshi:number|"all",feerate?:number,minconf?:number,utxos?:string[]) {
        let param = {
                destination: destination,
                satoshi: satoshi,
                feerate: feerate,
                minconf:minconf,
                utxos:utxos
            } as WithdrawRequest;

        return new Promise<WithdrawResult>((resolve, reject) => {
            (this.rpcRequest('withdraw', param) as Promise<WithdrawResult>)
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public newAddress(addresstype:OnchainAddressType = OnchainAddressType.all) {
        return new Promise<OnchainNewAddressResponse>((resolve, reject) => {
            (this.rpcRequest('newaddr', {
                addresstype: addresstype
            }) as Promise<OnchainNewAddressResponse>)
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }
    
    public listFunds() {
        return new Promise<listFundsResult>((resolve, reject) => {
            (this.rpcRequest('listfunds', {}) as Promise<listFundsResult>)
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }
    public listTransactions() {
        return new Promise<transaction[]>((resolve, reject) => {
            (this.rpcRequest('listtransactions', {}) as Promise<listTransactionsResult>)
            .then(data => {
                resolve(data.transactions);
            })
            .catch(reject)
        })
    }
    public async getRawBlockByHeight(height:number){
        return (this.rpcRequest('getrawblockbyheight', {
                height: height
            }) as Promise<rawBlock>)
    }
    public async getBlockHeaderByHeight(height:number){
        let rawBlock = await  this.getRawBlockByHeight(height)
                            .catch(error =>{
                                throw error;
                            })
        let block = Block.fromHex(rawBlock.block);

        return {
            hash:rawBlock.blockhash,
            height:height,
            version:block.version,
            merkleroot:block.merkleRoot?.toString(),
            timestamp:block.version,
            nonce:block.nonce,
            bits:block.bits,
            nTx:block.transactions?.length,
            previousblockhash:block.prevHash?.toString(),
            witnessCommit:block.witnessCommit?.toString()
        } as blockHeader;
    }

    public disconnectPeer(id:string) {
        return new Promise((resolve, reject) => {
            this.rpcRequest('disconnect', {
                id: id
            })
            .then(data => {
                resolve(data)
            })
            .catch(reject)
        })
    }

    public listPayments(bolt11 = null, payment_hash = null) {
        return new Promise<Payment[]>((resolve, reject) => {
            (this.rpcRequest('listpayments', {
                bolt11: bolt11,
                payment_hash: payment_hash
            } as PaymentPattern) as Promise<PaymentsResult>)
            .then((data:PaymentsResult) => {
                resolve(data.payments)
            })
            .catch(reject)
        })
    }
    public async listForwards() {
        return (this.rpcRequest('listpayments',{}) as Promise<listForwardsResult>)
                    .then(data =>{
                        return data.forwards;
                    });
    }
    public async listConfigs() {
        return (this.rpcRequest('listconfigs', {}) as Promise<config>)
    }
    public async getBitcoindConfig(){
        let config = await this.listConfigs();
        let result:bitcoinConfig|undefined;
        
        for (const plugin of config["important-plugins"]) {
            if(plugin.name=="bcli"){
                let bcli = (plugin.options as bcliOption);

                if(bcli){
                    result = {
                        rpcconnect: bcli["bitcoin-rpcconnect"]||"localhost",
                        rpcport:parseInt(bcli["bitcoin-rpcport"]||"0"),
                        rpcuser:bcli["bitcoin-rpcuser"]||"",
                        rpcpassword:bcli["bitcoin-rpcpassword"]||"",
                        retryTimeout:parseInt(bcli["bitcoin-retry-timeout"]||"0")
                    }
                }
            }
        }
        if(result == undefined){
            throw Error("bcli plugin not loated");
        }
        return result;
    }

    public devListAddresses(index = null) {
        return new Promise<Address[]>((resolve, reject) => {
            (this.rpcRequest('dev-listaddrs', {
                bip32_max_index: index
            }) as Promise<AddressesResult>)
            .then((data:AddressesResult) => {
                resolve(data.addresses)
            })
            .catch(reject)
        })
    }

    //Utility methods

    // utilConnectPeers: Connects Array of Peers sequentially
    //  `ignoreFailed` = `true` will pass connect error to Promise resolve.
    //  `ignoreFailed` = `false` will call Promise reject and will not try to connect
    //     to any additional peers. 
    public utilConnectPeers(peerList: string[], ignoreFailed = true) {
        const peers = peerList.map((url:string) => () => this.connectToPeer(url))
        return chainPromises(peers, ignoreFailed)
    }
}
}