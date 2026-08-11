import { FastifyInstance } from "fastify";
import { CredentialService } from "../services/credentialService";

export async function credentialRoutes(server:FastifyInstance) {

    server.addHook('preValidation', server.authenticate);
    server.post('/api/credentials' , async(request , reply)=>{
        const {name , apiKey}=request.body as any;
        const orgId=request.user.organizationId;

        if (!name || !apiKey) {
            return reply.code(400).send({ error: 'Name and apiKey are required.' });
            }

            try{
                await CredentialService.saveApiKey(orgId , name , apiKey);
                 return reply.send({ message: `Credential '${name}' successfully configured.` });
            }
            catch(error:any){
                return reply.code(500).send({ error: error.message });
            }
    });

    server.get('/api/credentials' , async(request , reply)=>{
        const orgId=request.user.organizationId;
        try{
            const list=await CredentialService.listCredentials(orgId);
            return reply.code(200).send({
            credentials: list 
            });
        }catch(err:any){
             return reply.code(500).send({ error: err.message });
        }
    })
    
}