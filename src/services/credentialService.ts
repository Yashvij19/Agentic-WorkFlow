import {prisma} from '../utils/db';
import { encryptCredential } from '../utils/crypto';

export class CredentialService{
    static async saveApiKey(orgId:string , name :string , apiKey:string){
        const encryptedData=encryptCredential(apiKey);

        const credentials = await prisma.credential.findFirst({
        where:{
            organizationId:orgId, 
            name
        }
        });

        if(credentials){
            await prisma.credential.update({
                where:{
                    id:credentials.id
                },
                data:{
                    encryptedData
                }
            });
        }

        return await prisma.credential.create({
            data:{
                name ,
                encryptedData, 
                organizationId:orgId
            }
        })

    }

    static async listCredentials(orgId:string){
        return await prisma.credential.findMany({
            where:{
                organizationId:orgId
            },
            select:{
                id:true,
                name:true,
            createdAt:true
            }
        });
    }
}