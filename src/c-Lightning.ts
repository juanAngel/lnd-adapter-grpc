

import { ServerUnaryCall,sendUnaryData, ServerWritableStream, ServerDuplexStream, UntypedHandleCall, setLogVerbosity, StatusObject } from "@grpc/grpc-js";
import { WalletBalanceRequest, WalletBalanceResponse, ChannelBalanceRequest, ChannelBalanceResponse, GetTransactionsRequest, TransactionDetails, EstimateFeeRequest, EstimateFeeResponse, SendCoinsRequest, SendCoinsResponse, ListUnspentRequest, ListUnspentResponse, Transaction, SendManyRequest, SendManyResponse, NewAddressRequest, NewAddressResponse, SignMessageRequest, SignMessageResponse, VerifyMessageRequest, VerifyMessageResponse, ConnectPeerRequest, ConnectPeerResponse, DisconnectPeerRequest, DisconnectPeerResponse, ListPeersRequest, ListPeersResponse, PeerEventSubscription, PeerEvent, GetInfoRequest, GetInfoResponse, GetRecoveryInfoRequest, GetRecoveryInfoResponse, PendingChannelsRequest, PendingChannelsResponse, ListChannelsRequest, ListChannelsResponse, ChannelEventSubscription, ChannelEventUpdate, ClosedChannelsRequest, ClosedChannelsResponse, OpenChannelRequest, ChannelPoint, OpenStatusUpdate, FundingTransitionMsg, FundingStateStepResp, ChannelAcceptResponse, ChannelAcceptRequest, CloseChannelRequest, CloseStatusUpdate, AbandonChannelRequest, AbandonChannelResponse, SendRequest, SendResponse, SendToRouteRequest, Invoice, AddInvoiceResponse, ListInvoiceRequest, ListInvoiceResponse, PaymentHash, InvoiceSubscription, PayReqString, PayReq, ListPaymentsRequest, ListPaymentsResponse, DeleteAllPaymentsRequest, DeleteAllPaymentsResponse, ChannelGraphRequest, ChannelGraph, NodeMetricsRequest, NodeMetricsResponse, ChanInfoRequest, ChannelEdge, NodeInfoRequest, NodeInfo, QueryRoutesRequest, QueryRoutesResponse, NetworkInfoRequest, NetworkInfo, StopRequest, StopResponse, GraphTopologySubscription, GraphTopologyUpdate, DebugLevelRequest, DebugLevelResponse, FeeReportRequest, FeeReportResponse, PolicyUpdateRequest, PolicyUpdateResponse, ForwardingHistoryRequest, ForwardingHistoryResponse, ExportChannelBackupRequest, ChannelBackup, ChanBackupExportRequest, ChanBackupSnapshot, VerifyChanBackupResponse, RestoreChanBackupRequest, RestoreBackupResponse, ChannelBackupSubscription, BakeMacaroonRequest, BakeMacaroonResponse, ListMacaroonIDsRequest, ListMacaroonIDsResponse, DeleteMacaroonIDRequest, DeleteMacaroonIDResponse, ListPermissionsRequest, ListPermissionsResponse, LightningNode, NodeAddress, AddressType, Amount, Peer, Channel, CommitmentType, ChannelConstraints, ChannelCloseSummary, Feature, Chain, ChannelFeeReport, Payment, ForwardingEvent } from "../models/rpc_pb";
import {LightningService,ILightningServer} from "../models/rpc_grpc_pb"
import {CLN} from "./clightning-rpc"
import { LogVerbosity, Status } from "@grpc/grpc-js/build/src/constants";
import { ServerErrorResponse } from "@grpc/grpc-js/build/src/server-call";
import {address, networks} from "bitcoinjs-lib"


function getFuncName(error:Error) {
    var sCallerName = "";
    {
        let re = /([^(]+)@|at ([^(]+) \(/g;
        let aRegexResult = re.exec(error.stack || "");
        if(aRegexResult)
            sCallerName = aRegexResult[1] || aRegexResult[2];
    }
    return sCallerName;
}
function msatToAmount(msat:number):Amount{
    let result = new Amount();

    result = result
                .setMsat(msat)
                .setSat(0);
    if(msat>=1000){
        result = result
                    .setSat(msat/1000);
    }
    return result;
}
function clnToLndPaymentStatus(status:CLN.PaymentStatus):Payment.PaymentStatus {
    let result;
    switch(status){
        case "complete":
            result = Payment.PaymentStatus.SUCCEEDED;            
            break;
        case "failed":
            result = Payment.PaymentStatus.FAILED;
            break;
        case "pending":
            result = Payment.PaymentStatus.IN_FLIGHT;
            break;
        default:
            result = Payment.PaymentStatus.UNKNOWN;

    }
    return result;
}
function clnToLndSChanId(s:string):number{
    let tokens = s.split("x");
    let digit = new Array<number>(tokens.length);

    for(let i = 0;i<tokens.length;i++){
        digit[i] = parseInt(tokens[i]);
    }

    return (digit[0] << 40) | (digit[1] << 16) | digit[2]
}

function clnToLndChannel_point(short_channel_id:string,funding_txid:string):string{
    let tokens = short_channel_id.split("x");

    return ""+funding_txid+":"+tokens[2];
}
function clnToLndCommitmentType(features:string[]):CommitmentType{
    let type = CommitmentType.LEGACY;

    for (const it of features) {
        if(it == "option_static_remotekey"){
            type = CommitmentType.STATIC_REMOTE_KEY;
            break;
        }else if(it == "option_anchor_outputs"){
            type = CommitmentType.ANCHORS;
            break;
        }else{
            type = CommitmentType.UNKNOWN_COMMITMENT_TYPE;
            break;
        }
    }

    return type;
}
function clnChannelIsOpen(status:string){
    let open = false;

    return open;
}
function clnAmountStringToMsat(amount:string){
    let reg = /([0-9,.]*)(sat|msat|btc)/ig

    let math = reg.exec(amount);
    if(math){
        let v = Number.parseFloat(math[1]);
        
        switch(math[2].toLowerCase()){
            case "btc":
                v *= 100000000000;
                break;
            case "sat":
                v*= 1000;
                break;
        }
        return v;

    }else{
        return NaN;
    }
}

class LightningServer implements ILightningServer{

    private rpc:any;
    [method: string]: UntypedHandleCall;
    static network:string = "testnet";
    constructor(clightningDir:string,network:string){
        LightningServer.network = network;
        this.rpc = new CLN.CLightningRPC(clightningDir+"/"+network+"/lightning-rpc");
        setLogVerbosity(LogVerbosity.DEBUG);
    }
    //walletBalance: handleUnaryCall<WalletBalanceRequest, WalletBalanceResponse>;
    walletBalance(call:ServerUnaryCall<WalletBalanceRequest,WalletBalanceResponse>,callback:sendUnaryData<WalletBalanceResponse>):void{
        console.debug(getFuncName(new Error()));

        (this.rpc as CLN.CLightningRPC).listFunds()
        .then((data)=>{
            let walletBalance = new WalletBalanceResponse();
            let confirmet = 0,unconfirmet = 0;

            for(let i = 0;i<data.outputs.length;i++){
                let it = data.outputs[i];
                if(it.status == "confirmed"){
                    confirmet+= it.value;
                }else{
                    unconfirmet+= it.value;
                }
            }
            walletBalance
                .setConfirmedBalance(confirmet)
                .setUnconfirmedBalance(unconfirmet)
                .setTotalBalance(unconfirmet+confirmet);


            callback(null,walletBalance);
        })
    }
    //channelBalance: handleUnaryCall<ChannelBalanceRequest, ChannelBalanceResponse>;
    channelBalance(call:ServerUnaryCall<ChannelBalanceRequest,ChannelBalanceResponse>,callback:sendUnaryData<ChannelBalanceResponse>):void{
        console.debug(getFuncName(new Error()));


        (this.rpc as CLN.CLightningRPC).listPeers()
        .then((data) =>{
            let channelBalance = new ChannelBalanceResponse();
            let pendingCapacity = 0,pendingLocal = 0,pendingRemote = 0,local = 0,remote = 0,capacity = 0;

            for(let i = 0;i<data.length;i++){
                for(let j = 0;j<data[i].channels.length;j++){
                    let it = data[i].channels[j];

                    if(it.state == "CHANNELD_NORMAL"){
                        local+=it.msatoshi_to_us;
                        remote+=it.receivable_msatoshi;
                        capacity+=it.msatoshi_total;
                    }else if(it.state == "CHANNELD_AWAITING_LOCKIN" || it.state == "OPENINGD"){
                        pendingLocal+=it.msatoshi_to_us;
                        pendingRemote+=it.receivable_msatoshi;
                        pendingCapacity+=it.msatoshi_total;
                    }
                }
            }
            channelBalance
                .setBalance(capacity)
                .setRemoteBalance(msatToAmount(remote))
                .setLocalBalance(msatToAmount(local))
                .setPendingOpenBalance(pendingCapacity)
                .setPendingOpenLocalBalance(msatToAmount(pendingLocal))
                .setPendingOpenRemoteBalance(msatToAmount(pendingRemote))
                .setUnsettledLocalBalance(msatToAmount(0))
                .setUnsettledRemoteBalance(msatToAmount(0));

            callback(null,channelBalance);
        })
    }
    //getTransactions: handleUnaryCall<GetTransactionsRequest, TransactionDetails>;
    getTransactions(call:ServerUnaryCall<GetTransactionsRequest,TransactionDetails>,callback:sendUnaryData<TransactionDetails>):void{
        console.debug(getFuncName(new Error()));
        (async (callback:sendUnaryData<TransactionDetails>) => {
            try {
                let transactionDetails = new TransactionDetails();
                let info  = await (this.rpc as CLN.CLightningRPC).getInfo();
                let listTransactions = await (this.rpc as CLN.CLightningRPC).listTransactions();

                let NETWORK = networks.bitcoin;
                switch(info.network){
                    case "testnet":
                        NETWORK = networks.testnet;
                        break;
                    case "regtest":
                        NETWORK = networks.regtest;
                        break;
                }

                for (const it of listTransactions) {
                    let transaction = new Transaction();
                    let amount = 0;

                    let timestamp = 0;
                    let blockHash = "";
                    let confirmations = it.blockheight?info.blockheight-it.blockheight:0;

                    /*
                    if(confirmations){
                        
                        try {
                            let block = await(this.rpc as CLN.CLightningRPC).getBlockHeaderByHeight(it.blockheight);
                            timestamp = block.timestamp;
                        } catch (error) {
                            console.debug(error);
                        }
                    }*/


                    for (const vout of it.outputs) {
                        amount += clnAmountStringToMsat(vout.satoshis)/1000;
                        transaction.addDestAddresses(address.fromOutputScript(Buffer.from(vout.scriptPubKey,"hex"),NETWORK));
                    }

                    transaction
                        .setTxHash(it.hash)
                        .setRawTxHex(it.rawtx)
                        .setBlockHeight(it.blockheight)
                        .setNumConfirmations(confirmations)
                        .setBlockHash(blockHash)
                        .setTimeStamp(timestamp)
                        .setAmount(amount)
                        //TODO: esteblecer el timestamp
                        .setTimeStamp(0);


                    transactionDetails.addTransactions(transaction);
                }
                callback(null,transactionDetails);
            } catch (error) {
                callback({code:Status.INTERNAL},null);
            }
            
        })(callback);
    }
    //estimateFee: handleUnaryCall<EstimateFeeRequest, EstimateFeeResponse>;
    estimateFee(call:ServerUnaryCall<EstimateFeeRequest,EstimateFeeResponse>,callback:sendUnaryData<EstimateFeeResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //sendCoins: handleUnaryCall<SendCoinsRequest, SendCoinsResponse>;
    sendCoins(call:ServerUnaryCall<SendCoinsRequest,SendCoinsResponse>,callback:sendUnaryData<SendCoinsResponse>):void{
        console.debug(getFuncName(new Error()));
        const param = call.request;

        (async (callback:sendUnaryData<SendCoinsResponse>)=>{
            let amount:number|"all" = param.getAmount();
            let feerate:number|undefined = param.getSatPerByte();
            if(param.getSendAll()){
                amount = "all"
            }
            if(feerate == 0){
                feerate = undefined;
            }

            try {
                let result = await (this.rpc as CLN.CLightningRPC).withdraw(param.getAddr(),amount,feerate)
                let sendCoinsResponse = new SendCoinsResponse();

                sendCoinsResponse.setTxid(result.txid);

                callback(null,sendCoinsResponse);
            } catch (error) {
                callback({code:Status.INTERNAL},null);
            }
        })(callback);

    }
    //listUnspent: handleUnaryCall<ListUnspentRequest, ListUnspentResponse>;
    listUnspent(call:ServerUnaryCall<ListUnspentRequest,ListUnspentResponse>,callback:sendUnaryData<ListUnspentResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //subscribeTransactions: handleServerStreamingCall<GetTransactionsRequest, Transaction>;
    subscribeTransactions(call:ServerWritableStream<GetTransactionsRequest,Transaction>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //sendMany: handleUnaryCall<SendManyRequest, SendManyResponse>;
    sendMany(call:ServerUnaryCall<SendManyRequest,SendManyResponse>,callback:sendUnaryData<SendManyResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //newAddress: handleUnaryCall<NewAddressRequest, NewAddressResponse>;
    newAddress(call:ServerUnaryCall<NewAddressRequest,NewAddressResponse>,callback:sendUnaryData<NewAddressResponse>):void{
        console.debug(getFuncName(new Error()));

        (this.rpc as CLN.CLightningRPC).newAddress()
        .then((data)=>{
            let newAddress = new NewAddressResponse();

            if(call.request.getType() == AddressType.WITNESS_PUBKEY_HASH || call.request.getType() == AddressType.UNUSED_WITNESS_PUBKEY_HASH){
                newAddress.setAddress(data.bech32);
            }else if(call.request.getType() == AddressType.NESTED_PUBKEY_HASH || call.request.getType() == AddressType.UNUSED_NESTED_PUBKEY_HASH){
                newAddress.setAddress(data["p2sh-segwit"]);
            }            

            callback(null,newAddress);
        })
    }
    //signMessage: handleUnaryCall<SignMessageRequest, SignMessageResponse>;
    signMessage(call:ServerUnaryCall<SignMessageRequest,SignMessageResponse>,callback:sendUnaryData<SignMessageResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //verifyMessage: handleUnaryCall<VerifyMessageRequest, VerifyMessageResponse>;
    verifyMessage(call:ServerUnaryCall<VerifyMessageRequest,VerifyMessageResponse>,callback:sendUnaryData<VerifyMessageResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //connectPeer: handleUnaryCall<ConnectPeerRequest, ConnectPeerResponse>;
    connectPeer(call:ServerUnaryCall<ConnectPeerRequest,ConnectPeerResponse>,callback:sendUnaryData<ConnectPeerResponse>):void{
        console.debug(getFuncName(new Error()));

        let lnAddr = call.request.getAddr();
        if(lnAddr)
            (this.rpc as CLN.CLightningRPC).connectToPeer(lnAddr.getPubkey(),lnAddr.getHost())
            .then((result)=>{
                let connectPeer = new ConnectPeerResponse();

                callback(null,connectPeer);
            }).catch(error =>{
                callback({code:Status.UNAVAILABLE},null);
            });


    }
    //disconnectPeer: handleUnaryCall<DisconnectPeerRequest, DisconnectPeerResponse>;
    disconnectPeer(call:ServerUnaryCall<DisconnectPeerRequest,DisconnectPeerResponse>,callback:sendUnaryData<DisconnectPeerResponse>):void{
        console.debug(getFuncName(new Error()));
        
        let pub = call.request.getPubKey();
        (this.rpc as CLN.CLightningRPC).disconnectPeer(pub)
        .then((result)=>{
            let disconnectPeer = new DisconnectPeerResponse();

            callback(null,disconnectPeer);
        });
    }
    //listPeers: handleUnaryCall<ListPeersRequest, ListPeersResponse>;
    listPeers(call:ServerUnaryCall<ListPeersRequest,ListPeersResponse>,callback:sendUnaryData<ListPeersResponse>):void{
        console.debug(getFuncName(new Error()));

        (this.rpc as CLN.CLightningRPC).listPeers()
        .then((peers)=>{
            let listPeers = new ListPeersResponse();

            for(let i = 0;i<peers.length;i++){
                let it = peers[i];
                let peer = new Peer();
                peer
                    .setPubKey(it.id)
                    .setSyncType(Peer.SyncType.ACTIVE_SYNC);

                if(it.netaddr && it.netaddr.length)
                    peer.setAddress(it.netaddr[0]);

                listPeers.addPeers(peer);
            }
            
            callback(null,listPeers);
        })
        
    }
    //subscribePeerEvents: handleServerStreamingCall<PeerEventSubscription, PeerEvent>;
    subscribePeerEvents(call:ServerWritableStream<PeerEventSubscription,PeerEvent>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //getRecoveryInfo: handleUnaryCall<GetRecoveryInfoRequest, GetRecoveryInfoResponse>;
    getRecoveryInfo(call:ServerUnaryCall<GetRecoveryInfoRequest,GetRecoveryInfoResponse>,callback:sendUnaryData<GetRecoveryInfoResponse>):void{
        console.debug(getFuncName(new Error()));

        callback({code:Status.UNIMPLEMENTED},null);
    }
    //pendingChannels: handleUnaryCall<PendingChannelsRequest, PendingChannelsResponse>;
    pendingChannels(call:ServerUnaryCall<PendingChannelsRequest,PendingChannelsResponse>,callback:sendUnaryData<PendingChannelsResponse>):void{
        console.debug(getFuncName(new Error()));
        

        (this.rpc as CLN.CLightningRPC).listPeers()
        .then(async peers =>{
            let pendingChannels = new PendingChannelsResponse();
            
            //TODO: mirar a que corresponde cada estado
            for await (const peer of peers) {
                for (const it of peer.channels) {
                    switch(it.state){
                        case "FUNDING_SPEND_SEEN":
                        case "OPENINGD":{
                                let chanelPendingOpen = new PendingChannelsResponse.PendingOpenChannel();

                                pendingChannels.addPendingOpenChannels(chanelPendingOpen);
                            }
                            break;
                        case "AWAITING_UNILATERAL":{

                        }
                        break;
                        case "CLOSINGD_SIGEXCHANGE":{

                        }
                        break;
                    }

                }
            }
            callback(null,pendingChannels);
        })

    }
    //listChannels: handleUnaryCall<ListChannelsRequest, ListChannelsResponse>;
    listChannels(call:ServerUnaryCall<ListChannelsRequest,ListChannelsResponse>,callback:sendUnaryData<ListChannelsResponse>):void{
        console.debug(getFuncName(new Error()));
        
        let filter:((channel:CLN.ChannelLocal) => boolean) = (channel):boolean =>{
            return true;
        };
        if(call.request.getPrivateOnly()){
            filter = (channel):boolean =>{
                return channel.private == true;
            };
        }else if(call.request.getPublicOnly()){
            filter = (channel):boolean =>{
                return channel.private == false;
            };
        }else if(call.request.getActiveOnly()){
            filter = (channel):boolean =>{
                return /*channel.active == true*/true;
            };
        }else if(call.request.getInactiveOnly()){
            filter = (channel):boolean =>{
                return /*channel. == false*/true;
            };
        }
        

        (this.rpc as CLN.CLightningRPC).listPeers()
        .then(async peers =>{
            let listChannels = new ListChannelsResponse();
            listChannels.setChannelsList(new Array());
            
            for await (const peer of peers) {
                for (const it of peer.channels) {
                    if(clnChannelIsOpen(it.state) && filter(it)){
                        let channel = new Channel();
                        let channelConstrain = new ChannelConstraints();

                        //let channelPublic = await (this.rpc as CLN.CLightningRPC).getChannel(it.short_channel_id);

                        channelConstrain
                            .setCsvDelay(it.their_to_self_delay)
                            .setMinHtlcMsat(it.htlc_minimum_msat)
                            .setMaxAcceptedHtlcs(it.max_accepted_htlcs)
                            .setMaxPendingAmtMsat(99000000)
                            .setDustLimitSat(it.dust_limit_satoshis)
                            .setChanReserveSat(it.their_channel_reserve_satoshis);

                        channel
                            .setRemotePubkey(peer.id)
                            .setChannelPoint(clnToLndChannel_point(it.short_channel_id,it.funding_txid))
                            .setThawHeight(0)
                            .setChanId(""+clnToLndSChanId(it.short_channel_id))
                            .setPrivate(it.private)
                            .setCloseAddress(it.close_to_addr)
                            .setCapacity(it.msatoshi_total/1000)
                            .setLocalBalance(it.msatoshi_to_us/1000)
                            .setRemoteBalance(it.receivable_msatoshi/1000)
                            .setPendingHtlcsList([])
                            .setCsvDelay(it.their_to_self_delay)
                            .setLocalConstraints(channelConstrain)
                            .setRemoteConstraints(channelConstrain)
                            .setCommitmentType(clnToLndCommitmentType(it.features))
                            .setStaticRemoteKey(channel.getCommitmentType()==CommitmentType.STATIC_REMOTE_KEY)
                            //NOTE: Experimental
                            .setActive(true)
                            .setChanStatusFlags("ChanStatusDefault")
                            .setInitiator(true)
                            .setUptime(100)
                            .setLifetime(100)
                            .setCommitFee(183)
                            .setCommitWeight(600)
                            .setFeePerKw(253)
                            .setLocalChanReserveSat(1000)
                            .setRemoteChanReserveSat(1000);
                            

                        listChannels.addChannels(channel);
                    }                
                    
                }
            }
            
            
            callback(null,listChannels);
        })

    }
    //subscribeChannelEvents: handleServerStreamingCall<ChannelEventSubscription, ChannelEventUpdate>;
    subscribeChannelEvents(call:ServerWritableStream<ChannelEventSubscription,ChannelEventUpdate>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //closedChannels: handleUnaryCall<ClosedChannelsRequest, ClosedChannelsResponse>;
    closedChannels(call:ServerUnaryCall<ClosedChannelsRequest,ClosedChannelsResponse>,callback:sendUnaryData<ClosedChannelsResponse>):void{
        console.debug(getFuncName(new Error()));
        let closedChannels = new ClosedChannelsResponse();
        let channelClosedList = [] as ChannelCloseSummary[];

        //let channelClosed = new ChannelCloseSummary();

        //channelClosedList.push(channelClosed);
        

        closedChannels.setChannelsList(channelClosedList);


        callback(null,closedChannels);
    }
    //openChannelSync: handleUnaryCall<OpenChannelRequest, ChannelPoint>;
    openChannelSync(call:ServerUnaryCall<OpenChannelRequest,ChannelPoint>,callback:sendUnaryData<ChannelPoint>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //openChannel: handleServerStreamingCall<OpenChannelRequest, OpenStatusUpdate>;
    openChannel(call:ServerWritableStream<OpenChannelRequest,OpenStatusUpdate>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //fundingStateStep: handleUnaryCall<FundingTransitionMsg, FundingStateStepResp>;
    fundingStateStep(call:ServerUnaryCall<FundingTransitionMsg,FundingStateStepResp>,callback:sendUnaryData<FundingStateStepResp>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //channelAcceptor: handleBidiStreamingCall<ChannelAcceptResponse, ChannelAcceptRequest>;
    channelAcceptor(call:ServerDuplexStream<ChannelAcceptResponse,ChannelAcceptRequest>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //closeChannel: handleServerStreamingCall<CloseChannelRequest, CloseStatusUpdate>;
    closeChannel(call:ServerWritableStream<CloseChannelRequest,CloseStatusUpdate>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //abandonChannel: handleUnaryCall<AbandonChannelRequest, AbandonChannelResponse>;
    abandonChannel(call:ServerUnaryCall<AbandonChannelRequest,AbandonChannelResponse>,callback:sendUnaryData<AbandonChannelResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //sendPayment: handleBidiStreamingCall<SendRequest, SendResponse>;
    sendPayment(call:ServerDuplexStream<SendRequest,SendResponse>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //sendPaymentSync: handleUnaryCall<SendRequest, SendResponse>;
    sendPaymentSync(call:ServerUnaryCall<SendRequest,SendResponse>,callback:sendUnaryData<SendResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //sendToRoute: handleBidiStreamingCall<SendToRouteRequest, SendResponse>;
    sendToRoute(call:ServerDuplexStream<SendToRouteRequest,SendResponse>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //sendToRouteSync: handleUnaryCall<SendToRouteRequest, SendResponse>;
    sendToRouteSync(call:ServerUnaryCall<SendToRouteRequest,SendResponse>,callback:sendUnaryData<SendResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //addInvoice: handleUnaryCall<Invoice, AddInvoiceResponse>;
    addInvoice(call:ServerUnaryCall<Invoice,AddInvoiceResponse>,callback:sendUnaryData<AddInvoiceResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //listInvoices: handleUnaryCall<ListInvoiceRequest, ListInvoiceResponse>;
    listInvoices(call:ServerUnaryCall<ListInvoiceRequest,ListInvoiceResponse>,callback:sendUnaryData<ListInvoiceResponse>):void{
        console.debug(getFuncName(new Error()));
        let param = call.request;

        (async (param:ListInvoiceRequest,callback:sendUnaryData<ListInvoiceResponse>) => {
            let listInvoices = new ListInvoiceResponse();

            let invoices = await (this.rpc as CLN.CLightningRPC).listInvoices();
            
            invoices.forEach(it => {
                let invoice = new Invoice();

                //invoice.setState(it.status);

                listInvoices.addInvoices(invoice);
            });


            callback(null,listInvoices);
        })(param,callback);
    }
    //lookupInvoice: handleUnaryCall<PaymentHash, Invoice>;
    lookupInvoice(call:ServerUnaryCall<PaymentHash,Invoice>,callback:sendUnaryData<Invoice>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //subscribeInvoices: handleServerStreamingCall<InvoiceSubscription, Invoice>;
    subscribeInvoices(call:ServerWritableStream<InvoiceSubscription,Invoice>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //decodePayReq: handleUnaryCall<PayReqString, PayReq>;
    decodePayReq(call:ServerUnaryCall<PayReqString,PayReq>,callback:sendUnaryData<PayReq>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //listPayments: handleUnaryCall<ListPaymentsRequest, ListPaymentsResponse>;
    listPayments(call:ServerUnaryCall<ListPaymentsRequest,ListPaymentsResponse>,callback:sendUnaryData<ListPaymentsResponse>):void{
        console.debug(getFuncName(new Error()));

        let param = call.request;

        (async (params:ListPaymentsRequest,callback:sendUnaryData<ListPaymentsResponse>) => {
            let listPayments = new ListPaymentsResponse();


            let payments = await (this.rpc as CLN.CLightningRPC).listPayments();

            payments.forEach(it => {
                let payment = new Payment();

                payment
                    .setValueMsat(clnAmountStringToMsat(it.amount_sent_msat))
                    .setPaymentRequest(it.bolt11)
                    .setPaymentPreimage(it.payment_preimage)
                    .setPaymentHash(it.payment_hash)
                    .setStatus(clnToLndPaymentStatus(it.status));

                listPayments.addPayments(payment);
            });


            callback(null,listPayments);
        })(param,callback);
        
    }
    //deleteAllPayments: handleUnaryCall<DeleteAllPaymentsRequest, DeleteAllPaymentsResponse>;
    deleteAllPayments(call:ServerUnaryCall<DeleteAllPaymentsRequest,DeleteAllPaymentsResponse>,callback:sendUnaryData<DeleteAllPaymentsResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //describeGraph: handleUnaryCall<ChannelGraphRequest, ChannelGraph>;
    describeGraph(call:ServerUnaryCall<ChannelGraphRequest,ChannelGraph>,callback:sendUnaryData<ChannelGraph>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //getNodeMetrics: handleUnaryCall<NodeMetricsRequest, NodeMetricsResponse>;
    getNodeMetrics(call:ServerUnaryCall<NodeMetricsRequest,NodeMetricsResponse>,callback:sendUnaryData<NodeMetricsResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //getChanInfo: handleUnaryCall<ChanInfoRequest, ChannelEdge>;
    getChanInfo(call:ServerUnaryCall<ChanInfoRequest,ChannelEdge>,callback:sendUnaryData<ChannelEdge>):void{
        console.debug(getFuncName(new Error()));

        let channelInfo = new ChannelEdge();

        callback(null,channelInfo);
    }
    //getNodeInfo: handleUnaryCall<NodeInfoRequest, NodeInfo>;
    getNodeInfo(call:ServerUnaryCall<NodeInfoRequest,NodeInfo>,callback:sendUnaryData<NodeInfo>):void{
        console.debug(getFuncName(new Error()));

        (async (call:ServerUnaryCall<NodeInfoRequest,NodeInfo>) =>{
            let resNodeInfo = new NodeInfo();
            let node = new LightningNode();

            const [nodeInfo,peerChannels] = await Promise.all([
                (this.rpc as CLN.CLightningRPC).getNode(call.request.getPubKey()),
                (this.rpc as CLN.CLightningRPC).listChannelsByPeer(call.request.getPubKey())
            ]);
            let capacity = 0;

            for(let i = 0;i<peerChannels.length;i++){
                let channel = peerChannels[i];
                /*let channelEdge = new ChannelEdge();

                channelEdge
                    .setCapacity(channel.satoshis)
                    .setChanPoint();*/

                capacity += channel.satoshis;
                //nodeInfo.addChannels(channelEdge);
            }
            resNodeInfo.setNumChannels(peerChannels.length);
            resNodeInfo.setTotalCapacity(capacity);

            node.setPubKey(nodeInfo.nodeid)
            .setAlias(nodeInfo.alias)
            .setColor("#"+nodeInfo.color)
            .setLastUpdate(nodeInfo.last_timestamp);

            //TODO:mapear las features
            //node.getFeaturesMap();

            for(let i = 0;i<nodeInfo.addresses.length;i++){
                let addr = new NodeAddress();

                addr.setAddr(nodeInfo.addresses[i].address+":"+nodeInfo.addresses[i].port)
                .setNetwork("tcp");

                node.addAddresses(addr);
            }
            

            resNodeInfo.setNode(node);
            //TODO:agregar informacion de los canales
            
            
            callback(null, resNodeInfo);
        })(call);
        
    }
    //getInfo: grpc.handleUnaryCall<rpc_pb.GetInfoRequest, rpc_pb.GetInfoResponse>;
    getInfo(call:ServerUnaryCall<GetInfoRequest,GetInfoResponse>,callback:sendUnaryData<GetInfoResponse>):void{
        console.debug(getFuncName(new Error()));
        (this.rpc as CLN.CLightningRPC).getInfo()
        .then((data)=>{
            let info = new GetInfoResponse();

            info.setIdentityPubkey(data.id);
            info.setAlias(data.alias);
            info.setColor(data.color);
            info.setVersion("0.11.0 "+data.version);
            info.setNumPeers(data.num_peers);
            info.setNumActiveChannels(data.num_active_channels);
            info.setNumInactiveChannels(data.num_inactive_channels);
            info.setNumPendingChannels(data.num_pending_channels);
            info.setBlockHeight(data.blockheight);
            info.setTestnet(data.network=="testnet");

            for(let i = 0;i<data.address.length;i++){
                let addr = data.address[i];
                info.addUris(addr.address+":"+addr.port);
            }
            //NOTE: Experimental
            let featuresMap = info.getFeaturesMap();

            let staticRemoteKeyFeature = new Feature();
            staticRemoteKeyFeature.setName("static-remote-key")
                .setIsRequired(true)
                .setIsKnown(true);

            let chainList = new Array<Chain>();
            let bitcoinTestnetChain = new Chain();
            bitcoinTestnetChain
                .setChain("bitcoin")
                .setNetwork("testnet");
                chainList.push(bitcoinTestnetChain);

            featuresMap.set(12,staticRemoteKeyFeature);

            info.setSyncedToChain(true)
                .setSyncedToGraph(true)
                .setChainsList(chainList);
            

            callback(null,info);
        })
        .catch((error)=>{
            console.log(error);
        });
        console.log("getInfo");
    }
    //queryRoutes: handleUnaryCall<QueryRoutesRequest, QueryRoutesResponse>;
    queryRoutes(call:ServerUnaryCall<QueryRoutesRequest,QueryRoutesResponse>,callback:sendUnaryData<QueryRoutesResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //getNetworkInfo: handleUnaryCall<NetworkInfoRequest, NetworkInfo>;
    getNetworkInfo(call:ServerUnaryCall<NetworkInfoRequest,NetworkInfo>,callback:sendUnaryData<NetworkInfo>):void{
        console.debug(getFuncName(new Error()));
        let networkInfo = new NetworkInfo();

        callback(null,networkInfo);
    }
    //stopDaemon: handleUnaryCall<StopRequest, StopResponse>;
    stopDaemon(call:ServerUnaryCall<StopRequest,StopResponse>,callback:sendUnaryData<StopResponse>):void{
        console.debug(getFuncName(new Error()));
        (this.rpc as CLN.CLightningRPC).stop()
        .catch(()=>{
            let stop = new StopResponse();

            callback(null,stop);
        });
    }
    //subscribeChannelGraph: handleServerStreamingCall<GraphTopologySubscription, GraphTopologyUpdate>;
    subscribeChannelGraph(call:ServerWritableStream<GraphTopologySubscription,GraphTopologyUpdate>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //debugLevel: handleUnaryCall<DebugLevelRequest, DebugLevelResponse>;
    debugLevel(call:ServerUnaryCall<DebugLevelRequest,DebugLevelResponse>,callback:sendUnaryData<DebugLevelResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //feeReport: handleUnaryCall<FeeReportRequest, FeeReportResponse>;
    feeReport(call:ServerUnaryCall<FeeReportRequest,FeeReportResponse>,callback:sendUnaryData<FeeReportResponse>):void{
        console.debug(getFuncName(new Error()));
        let status = {code:Status.INTERNAL} as ServerErrorResponse;
        let feeReport = new FeeReportResponse();


        (this.rpc as CLN.CLightningRPC).listPeers()
        .then(async (peers) =>{
            for await (const peer of peers) {
                for (const it of peer.channels) {
                    let channelFee = new ChannelFeeReport();
                    let channelPublic = await (this.rpc as CLN.CLightningRPC).getChannel(it.short_channel_id);

                    channelFee
                        .setChanId(""+clnToLndSChanId(it.short_channel_id))
                        .setChannelPoint(clnToLndChannel_point(it.short_channel_id,it.funding_txid))
                        .setBaseFeeMsat(channelPublic.base_fee_millisatoshi)
                        .setFeePerMil(channelPublic.fee_per_millionth)
                        .setFeeRate(channelPublic.fee_per_millionth/1000000.0);

                    feeReport.addChannelFees(channelFee);
                }
            }
            //TODO: Calcular las ganancias diarias, semanales y mensuales
            callback(null,feeReport);
        }).catch(()=>{
            callback(status,null);
        })

    }
    //updateChannelPolicy: handleUnaryCall<PolicyUpdateRequest, PolicyUpdateResponse>;
    updateChannelPolicy(call:ServerUnaryCall<PolicyUpdateRequest,PolicyUpdateResponse>,callback:sendUnaryData<PolicyUpdateResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //forwardingHistory: handleUnaryCall<ForwardingHistoryRequest, ForwardingHistoryResponse>;
    forwardingHistory(call:ServerUnaryCall<ForwardingHistoryRequest,ForwardingHistoryResponse>,callback:sendUnaryData<ForwardingHistoryResponse>):void{
        console.debug(getFuncName(new Error()));
        let param = call.request;

        (async (param:ForwardingHistoryRequest,callback:sendUnaryData<ForwardingHistoryResponse>) => {
            let forwardingHistory = new ForwardingHistoryResponse();

            let forwardings = await (this.rpc as CLN.CLightningRPC).listForwards();

            for (const it of forwardings) {
                let event = new ForwardingEvent();

                event
                    .setFee(it.fee/1000)
                    .setFeeMsat(clnAmountStringToMsat(it.fee_msat))
                    .setChanIdIn(clnToLndSChanId(it.in_channel).toString())
                    .setChanIdOut(clnToLndSChanId(it.out_channel).toString())
                    .setAmtOutMsat(clnAmountStringToMsat(it.out_msat))
                    .setTimestamp(it.received_time);

                forwardingHistory.addForwardingEvents();
            }


            callback(null,forwardingHistory);
        })(param,callback);

        
    }
    //exportChannelBackup: handleUnaryCall<ExportChannelBackupRequest, ChannelBackup>;
    exportChannelBackup(call:ServerUnaryCall<ExportChannelBackupRequest,ChannelBackup>,callback:sendUnaryData<ChannelBackup>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //exportAllChannelBackups: handleUnaryCall<ChanBackupExportRequest, ChanBackupSnapshot>;
    exportAllChannelBackups(call:ServerUnaryCall<ChanBackupExportRequest,ChanBackupSnapshot>,callback:sendUnaryData<ChanBackupSnapshot>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //verifyChanBackup: handleUnaryCall<ChanBackupSnapshot, VerifyChanBackupResponse>;
    verifyChanBackup(call:ServerUnaryCall<ChanBackupSnapshot,VerifyChanBackupResponse>,callback:sendUnaryData<VerifyChanBackupResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //restoreChannelBackups: handleUnaryCall<RestoreChanBackupRequest, RestoreBackupResponse>;
    restoreChannelBackups(call:ServerUnaryCall<RestoreChanBackupRequest,RestoreBackupResponse>,callback:sendUnaryData<RestoreBackupResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //subscribeChannelBackups: handleServerStreamingCall<ChannelBackupSubscription, ChanBackupSnapshot>;
    subscribeChannelBackups(call:ServerWritableStream<ChannelBackupSubscription,ChanBackupSnapshot>):void{
        console.debug(getFuncName(new Error()));
        call.end();
    }
    //bakeMacaroon: handleUnaryCall<BakeMacaroonRequest, BakeMacaroonResponse>;
    bakeMacaroon(call:ServerUnaryCall<BakeMacaroonRequest,BakeMacaroonResponse>,callback:sendUnaryData<BakeMacaroonResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //listMacaroonIDs: handleUnaryCall<ListMacaroonIDsRequest, ListMacaroonIDsResponse>;
    listMacaroonIDs(call:ServerUnaryCall<ListMacaroonIDsRequest,ListMacaroonIDsResponse>,callback:sendUnaryData<ListMacaroonIDsResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //deleteMacaroonID: handleUnaryCall<DeleteMacaroonIDRequest, DeleteMacaroonIDResponse>;
    deleteMacaroonID(call:ServerUnaryCall<DeleteMacaroonIDRequest,DeleteMacaroonIDResponse>,callback:sendUnaryData<DeleteMacaroonIDResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
    //listPermissions: handleUnaryCall<ListPermissionsRequest, ListPermissionsResponse>;
    listPermissions(call:ServerUnaryCall<ListPermissionsRequest,ListPermissionsResponse>,callback:sendUnaryData<ListPermissionsResponse>):void{
        console.debug(getFuncName(new Error()));
        callback({code:Status.UNIMPLEMENTED},null);
    }
}

export{
    LightningService,
    LightningServer
}