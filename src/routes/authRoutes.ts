import { FastifyInstance } from "fastify";
import { AuthService } from "../services/authService";
import { userInfo } from "node:os";
import { error } from "node:console";

export async function authRoutes(server:FastifyInstance){
    server.post('/api/auth/register', async(request ,reply)=>{
        const {email , password , orgName}=request.body as any;

        if(!email || !password){
             return reply.code(400).send({ error: 'Email and password are required.' });
        }

        try{
            const {user}=await AuthService.register(email , password, orgName );
            const token=server.jwt.sign({
                id:user.id,
                organizationId:user.organizationId,
                email:user.email
            });

            return reply.code(200).send({
                message: 'Account registered successfully.',
                token,
                user: { id: user.id, email: user.email, organizationId: user.organizationId }
            });
        }catch(error:any){
             return reply.code(400).send({ error: error.message });
        }
    });

    server.post('/api/auth/login', async(request , reply)=>{
        const {email ,password}=request.body as any;

        if(!email || !password){
            return reply.code(400).send({error:"Email and password are required."});
        }

        try{
            const user=await AuthService.login(email , password);
               
            const token = server.jwt.sign({
                id: user.id,
                organizationId: user.organizationId,
                email: user.email,
            });

            return reply.code(200).send({
                 message: 'Signed in successfully.',
                token,
                user: { id: user.id, email: user.email, organizationId: user.organizationId }
            });
            
        }catch(error:any){
            return reply.code(401).send({
                 error: error.message 
            });
        }
    });

    
}