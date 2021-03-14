import { KeyCertPair, Server, ServerCredentials } from '@grpc/grpc-js'

import { LightningService, LightningServer } from "./c-Lightning"


const server = new Server();
export function grpcStart(clightningDir:string,network:string,ip: string, port: number, cred_key:KeyCertPair[]|null) {
    let cred:ServerCredentials;

    if(!cred_key){
        cred =ServerCredentials.createInsecure();
    }else{
        cred = ServerCredentials.createSsl(null,cred_key);
    }
    console.log(ip+":"+port.toString());

    server.addService(LightningService, new LightningServer(clightningDir,network));
    server.bindAsync(ip+":"+port.toString(),
        cred,
        error => {
            if (error) {
                console.error("error: ", error);
                return
            }
            server.start();
            console.log('Server Started at '+ip+":"+port);
        }
    )
}
