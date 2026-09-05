import { FastifyInstance } from "fastify";
import { AuthService } from "../services/authService";


export async function authRoutes(server: FastifyInstance) {
    // 🛡️ Strict Auth Rate Limits: 5 attempts per minute per IP to stop brute-force & CPU starvation
    const authRateLimitConfig = {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute',
            }
        }
    };

    server.post('/api/auth/register', authRateLimitConfig, async(request ,reply)=>{
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
              
            const token = server.jwt.sign(
                {
                    id: user.id,
                    organizationId: user.organizationId,
                    email: user.email,
                    role: user.role
                },
                {
                    expiresIn: process.env.JWT_EXPIRES_IN || '4h'
                }
            );

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

    server.post('/api/auth/login', authRateLimitConfig, async(request , reply)=>{
        const {email ,password}=request.body as any;

        if(!email || !password){
            return reply.code(400).send({error:"Email and password are required."});
        }

        try{
            const user=await AuthService.login(email , password);
               
            const token = server.jwt.sign(
                {
                    id: user.id,
                    organizationId: user.organizationId,
                    email: user.email,
                    role: user.role
                },
                {
                    expiresIn: process.env.JWT_EXPIRES_IN || '4h'
                }
            );

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

    // 🛡️ Public: Check if account has 2FA enabled for Forgot Password modal routing
    server.post('/api/auth/2fa/status', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        try {
            const { email } = (request.body as any) || {};
            if (!email) {
                return reply.code(400).send({ error: 'Email is required.' });
            }
            const status = await AuthService.check2FAStatus(email);
            return reply.code(200).send(status);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // 🛡️ Authenticated: Generate 2FA Secret Key, QR URI, and 5 Backup Codes
    server.post('/api/auth/2fa/setup', async (request, reply) => {
        try {
            await server.authenticate(request, reply);
            if (!request.user) return;
            const setupPayload = await AuthService.setup2FA(request.user.id);
            return reply.code(200).send(setupPayload);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // 🛡️ Authenticated: Verify rolling 6-digit code and activate 2FA
    server.post('/api/auth/2fa/enable', async (request, reply) => {
        try {
            await server.authenticate(request, reply);
            if (!request.user) return;
            const { code } = (request.body as any) || {};
            if (!code) {
                return reply.code(400).send({ error: '6-digit verification code is required.' });
            }
            const result = await AuthService.enable2FA(request.user.id, code);
            return reply.code(200).send(result);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // 🛡️ Authenticated: Disable 2FA (Requires password & confirmation code)
    server.post('/api/auth/2fa/disable', async (request, reply) => {
        try {
            await server.authenticate(request, reply);
            if (!request.user) return;
            const { password, code } = (request.body as any) || {};
            if (!password || !code) {
                return reply.code(400).send({ error: 'Current password and verification code are required to disable 2FA.' });
            }
            const result = await AuthService.disable2FA(request.user.id, password, code);
            return reply.code(200).send(result);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // 🛡️ Authenticated: Regenerate 5 fresh backup recovery codes
    server.post('/api/auth/2fa/regenerate-backup-codes', async (request, reply) => {
        try {
            await server.authenticate(request, reply);
            if (!request.user) return;
            const { password } = (request.body as any) || {};
            if (!password) {
                return reply.code(400).send({ error: 'Current password is required to regenerate backup codes.' });
            }
            const result = await AuthService.regenerateBackupCodes(request.user.id, password);
            return reply.code(200).send(result);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // 🛡️ Public: Rate-limited self-service password reset protected by Microsoft Authenticator or Backup Code
    server.post('/api/auth/forgot-password', {
        config: {
            rateLimit: {
                max: 3,
                timeWindow: '1 minute',
            }
        }
    }, async (request, reply) => {
        try {
            const { email, code, newPassword } = (request.body as any) || {};
            if (!email || !code || !newPassword) {
                return reply.code(400).send({ error: 'Email, verification code (or backup code), and new password are required.' });
            }
            const result = await AuthService.forgotPasswordWith2FA(email, code, newPassword);
            return reply.code(200).send(result);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });
}