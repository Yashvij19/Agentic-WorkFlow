import crypto from 'crypto';
import { prisma } from '../utils/db';

export class AdminService{

     // ==========================================
    // 1. INVITE TOKEN SERVICE METHODS
    // ==========================================

    static async createInviteToken(orgID:string , validForHours?:number){
        const activeTokenCount=await prisma.orgInviteToken.count({
            where:{
                organizationId:orgID,
                expiresAt:{
                    gt:new Date()
                }
            }
        });

        if(activeTokenCount>=3){
             throw new Error("Maximum of 3 active tokens are allowed at a time for your organization.");
        }

        // Create a unique token code (e.g. TOK-A8B9C1)
         const token = `TOK-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (validForHours || 24)); // Default to 24 hours  , registration approval request is set for 3 day expire but invite toke is expres at 24 hours

        return await prisma.orgInviteToken.create({
          data:{
            token,
            organizationId:orgID,
            expiresAt
          }  
        });


    }

    static async getInviteTokens(orgId:string){
        return await prisma.orgInviteToken.findMany({
            where:{
                organizationId:orgId,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy:{
                createdAt: 'desc'
            }
        });
    }

    static async revokeInviteToken(orgId:string ,tokenId:string){
        const deleteResult=await prisma.orgInviteToken.deleteMany({
            where:{
                id:tokenId,
                organizationId:orgId
            }
        });

        if(deleteResult.count===0){
              throw new Error("Invite token not found or already deleted.");
        }
         return { success: true };
    }

    // ==========================================
    // 2. MEMBER REGISTRATION APPROVALS
    // ==========================================

    static async getPendingRequests(orgId:string){
        await prisma.registrationRequest.deleteMany({
            where:{
                organizationId:orgId,
                expiresAt:{
                    lte:new Date()
                }
            }
        });

        return await  prisma.registrationRequest.findMany({
            where:{
                organizationId: orgId,
                expiresAt: {
                    gt: new Date()
                }
            },
            select:{
                 id: true,
                email: true,
                createdAt: true,
                expiresAt: true
            },
            orderBy:{
                createdAt: 'desc'
            }
        });

    }

    static async approveRegistrationRequest(orgId:string ,requestId:string){
        const pendingRequest=await prisma.registrationRequest.findFirst({
            where:{
                id:requestId,
                organizationId:orgId
            }
        });

        if(!pendingRequest){
             throw new Error("Registration request not found.");
        }

         if (new Date(pendingRequest.expiresAt) <= new Date()) {
            // await prisma.registrationRequest.delete({ where: { id: pendingRequest.id } });
            throw new Error("Registration request has expired.");
        }

        return await prisma.$transaction(async(tx)=>{
            const user=await tx.user.create({
                data:{
                   email: pendingRequest.email,
                    passwordHash: pendingRequest.passwordHash,
                    role: 'MEMBER',
                    organizationId: pendingRequest.organizationId,
                    permissions: {
                        canCreateWorkflow: true,
                        canViewTeamWorkflows: false,
                        canViewTeamExecutions: false,
                        canViewTeamFailedExecutions: false,
                        canDeleteTeamWorkflows: false,
                        canExecuteTeamWorkflows: false,
                        allowedWorkflowIds: []
                    } 
                }
            });
            await tx.registrationRequest.delete({
                 where: { id: pendingRequest.id }
            })

             return user;

        });
    }

    static async rejectRegistrationRequest(orgId:string , requestId:string){
       const deleteResult = await prisma.registrationRequest.deleteMany({
            where: {
                id: requestId,
                organizationId: orgId
            }
        });
        if (deleteResult.count === 0) {
                    throw new Error("Registration request not found.");
        }

        return { success: true };


    }


     // ==========================================
    // 3. MEMBER PERMISSIONS AND PROMOTIONS
    // ==========================================

    static async getOrganizationUsers(orgId:string){
        return await prisma.user.findMany({
            where:{
                organizationId:orgId
            },
            select:{
                id: true,
                email: true,
                role: true,
                permissions: true,
                createdAt: true
            },
            orderBy:{
                createdAt: 'asc'
            }
        });
    }

    static async updateUserRole(orgId:string , userId:string , role:'ADMIN' | 'MEMBER'){
        const userToUpdate=await prisma.user.findFirst({
            where:{
                organizationId:orgId ,
                id:userId
            }
        });
        if(!userToUpdate){
             throw new Error("User not found in your organization.");
        }

        if(userToUpdate.role==="SINGLE"){
            throw new Error("Cannot change the role of a single user.");
        }

         return await prisma.user.update({
            where: { id: userId },
            data: { role }
        });
    }


    static async updateUserPermissions(orgId:string , userId:string , permissions:any){
         const userToUpdate = await prisma.user.findFirst({
            where: { id: userId, organizationId: orgId }
        });
        if (!userToUpdate) {
            throw new Error("User not found in your organization.");
        }

        return await prisma.user.update({
            where: { id: userId },
            data: {
                permissions: {
                    canCreateWorkflow: permissions.canCreateWorkflow !== undefined ? !!permissions.canCreateWorkflow : true,
                    canViewTeamWorkflows: permissions.canViewTeamWorkflows !== undefined ? !!permissions.canViewTeamWorkflows : false,
                    canEditTeamWorkflows: permissions.canEditTeamWorkflows !== undefined ? !!permissions.canEditTeamWorkflows : false,
                    canRenameTeamWorkflows: permissions.canRenameTeamWorkflows !== undefined ? !!permissions.canRenameTeamWorkflows : false,
                    canDeleteTeamWorkflows: permissions.canDeleteTeamWorkflows !== undefined ? !!permissions.canDeleteTeamWorkflows : false,
                    canExecuteTeamWorkflows: permissions.canExecuteTeamWorkflows !== undefined ? !!permissions.canExecuteTeamWorkflows : false,
                    canViewTeamExecutions: permissions.canViewTeamExecutions !== undefined ? !!permissions.canViewTeamExecutions : false,
                    canViewTeamFailedExecutions: permissions.canViewTeamFailedExecutions !== undefined ? !!permissions.canViewTeamFailedExecutions : false,
                    canViewDLQ: permissions.canViewDLQ !== undefined ? !!permissions.canViewDLQ : (permissions.canViewTeamFailedExecutions !== undefined ? !!permissions.canViewTeamFailedExecutions : false),
                    canCreatePersonalKnowledgeBase: permissions.canCreatePersonalKnowledgeBase !== undefined ? !!permissions.canCreatePersonalKnowledgeBase : false,
                    canChangeOrgKnowledgeBase: permissions.canChangeOrgKnowledgeBase !== undefined ? !!permissions.canChangeOrgKnowledgeBase : false,
                    allowedWorkflowIds: Array.isArray(permissions.allowedWorkflowIds) ? permissions.allowedWorkflowIds : []
                }
            }
        });


    }


}