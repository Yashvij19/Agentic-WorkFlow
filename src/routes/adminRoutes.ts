import { FastifyInstance } from "fastify";
import crypto from 'crypto'
import { prisma } from "../utils/db";
import { AdminService } from "../services/adminService";
import { AuthService } from "../services/authService";
import { request } from "http";


export async function adminRoutes(server:FastifyInstance) {

    server.addHook('preValidation' , async(request , reply)=>{
        await server.authenticate(request , reply);
        if(!request.user||request.user.role!=="ADMIN"){
             return reply.code(403).send({ error: "Forbidden: Admin access required." });
        }
    })


    // ==========================================
    // 1. INVITE TOKEN MANAGEMENT
    // ==========================================

    server.post("/api/org/tokens" , async(request,reply)=>{
        const orgId=request.user.organizationId;
        const {validForHours}=request.body as any ||{};

        try{
            const inviteToken=await AdminService.createInviteToken(orgId , validForHours);
            return reply.code(201).send({
                message: "Invite token generated successfully.",
                inviteToken
            });
        }
        catch(err:any){
             return reply.code(400).send({ error: err.message });
        }
    });

    // List all active (unexpired) invite tokens
    server.get("/api/org/tokens", async(request , reply)=>{
        const orgId=request.user.organizationId;
        try{
            const tokens=await AdminService.getInviteTokens(orgId);
             return reply.send(tokens); 
        }catch(err:any){
             return reply.code(500).send({ error: err.message });
        }
    });

     // Delete/revoke an invite token manually
     server.delete("/api/org/tokens/:id", async(request ,reply)=>{
        const orgId=request.user.organizationId;
        const {id}=request.params as any;

        try{
            await AdminService.revokeInviteToken(orgId , id);
             return reply.send({ message: "Invite token revoked successfully." });
        }
        catch (err: any) {
            return reply.code(404).send({ error: err.message });
        }
     })


      // ==========================================
    // 2. MEMBER REGISTRATION APPROVALS
    // ==========================================
    // List all pending registration requests

    server.get("/api/org/requests" , async(request , reply)=>{
        const orgId=request.user.organizationId;
        try {
            const pendingRequests = await AdminService.getPendingRequests(orgId);
            return reply.send(pendingRequests);
        } catch (err: any) {
            return reply.code(500).send({ error: err.message });
        }
    });


    // Approve a pending registration request
    server.post("/api/org/requests/:id/approve" , async(request , reply)=>{
        const orgId=request.user.organizationId;
         const { id } = request.params as any;

         try{
             const newUser = await AdminService.approveRegistrationRequest(orgId, id);
            return reply.send({
                message: "User successfully registered and approved.",
                user: { id: newUser.id, email: newUser.email, role: newUser.role }
            });
         }catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }

    });

    
    // Reject/delete a pending registration request

    server.post('/api/org/requests/:id/reject' , async(request , reply)=>{
        const orgId = request.user.organizationId;
        const { id } = request.params as any;
        try {
            await AdminService.rejectRegistrationRequest(orgId, id);
            return reply.send({ message: "Registration request rejected and removed." });
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    // ==========================================
    // 3. MEMBER PERMISSIONS AND PROMOTIONS
    // ==========================================

 // List all users in the organization

 server.get("/api/org/users", async(request ,reply)=>{

    const orgId=request.user.organizationId;
    try{
        const users=await AdminService.getOrganizationUsers(orgId);
         return reply.send(users);
    }catch(err:any){
          return reply.code(500).send({ error: err.message });
    }
 });

  // Promote a MEMBER to ADMIN (or change roles between ADMIN and MEMBER)

  server.put('/api/org/users/:userId/role', async (request, reply) => {
        const orgId = request.user.organizationId;
        const { userId } = request.params as any;
        const { role } = request.body as any;
        try {
            const updatedUser = await AdminService.updateUserRole(orgId, userId, role);
            return reply.send({
                message: `User role updated to ${role} successfully.`,
                user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }
            });
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

 // Update user permissions

   server.put('/api/org/users/:userId/permissions', async (request, reply) => {
        const orgId = request.user.organizationId;
        const { userId } = request.params as any;
        const { permissions } = request.body as any;
        try {
            const updatedUser = await AdminService.updateUserPermissions(orgId, userId, permissions);
            return reply.send({
                message: "Permissions updated successfully.",
                user: { id: updatedUser.id, email: updatedUser.email, permissions: updatedUser.permissions }
            });
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });


    
}

