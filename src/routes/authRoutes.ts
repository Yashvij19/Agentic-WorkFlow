import { FastifyInstance } from "fastify";
import { AuthService } from "../services/authService";


export async function authRoutes(server:FastifyInstance){
    server.post('/api/auth/register', async(request ,reply)=>{
        const {email , password , orgName , orgRole , inviteToken , address , registrationType}=request.body as any;

        if(!email || !password || !registrationType){
             return reply.code(400).send({ error: 'Email, password, and registrationType are required.' });
        }
          if (registrationType !== 'SINGLE' && registrationType !== 'ORGANIZATION') {
            return reply.code(400).send({ error: 'registrationType must be either SINGLE or ORGANIZATION.' });
        }

        try{
            const result = await AuthService.register({
                email,
                passwordPlain: password,
                registrationType,
                orgRole,
                orgName,
                address,
                inviteToken
            });

            if(result.status==='PENDING'){
                 return reply.code(202).send({
                    status: 'PENDING',
                     requestId: result.requestId,
                    expiresAt: result.expiresAt,
                    message: result.message
                });
            }
              // APPROVED (SINGLE or ADMIN) - Generate JWT token and return session

              const user=result.user!;
              
            const token=server.jwt.sign({
                id:user.id,
                organizationId:user.organizationId,
                email:user.email,
                role:user.role
            });

            return reply.code(200).send({
                message: 'Account registered successfully.',
                token,
                user: { 
                    id: user.id, 
                    email: user.email, 
                    organizationId: user.organizationId, 
                    role: user.role,
                    permissions: user.permissions 
                }
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
                role:user.role
            });

            return reply.code(200).send({
                 message: 'Signed in successfully.',
                token,
                user: { 
                    id: user.id, 
                    email: user.email, 
                    organizationId: user.organizationId, 
                    role: user.role,
                    permissions: user.permissions 
                }
            });
            
        }catch(error:any){
            return reply.code(401).send({
                 error: error.message 
            });
        }
    });

    server.get('/api/auth/me', async (request, reply) => {
        try {
            await server.authenticate(request, reply);
            if (!request.user) return;
            const userId = request.user.id;
            const profile = await AuthService.getProfile(userId);
            return reply.code(200).send(profile);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    server.post('/api/auth/reset-password', async (request, reply) => {
        try {
            await server.authenticate(request, reply);
            if (!request.user) return;
            const userId = request.user.id;
            const { oldPassword, newPassword } = (request.body as any) || {};
            if (!oldPassword || !newPassword) {
                return reply.code(400).send({ error: 'Both current password and new password are required.' });
            }
            const result = await AuthService.resetPassword(userId, oldPassword, newPassword);
            return reply.code(200).send(result);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    server.post('/api/auth/forgot-password', async (request, reply) => {
        try {
            const { email, newPassword } = (request.body as any) || {};
            if (!email || !newPassword) {
                return reply.code(400).send({ error: 'Email and new password are required.' });
            }
            const result = await AuthService.forgotPassword(email, newPassword);
            return reply.code(200).send(result);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });
}