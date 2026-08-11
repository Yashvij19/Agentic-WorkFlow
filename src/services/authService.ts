import crypto, { randomBytes } from 'crypto';
import {prisma} from '../utils/db';
import { emit } from 'cluster';


export function hashPassword(password:string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash=crypto.pbkdf2Sync(password , salt , 1000 , 6,  'sha512').toString('hex');

    return `${salt}:${hash}`

}


export function verifyPassword(password:string , storedHash:string) :boolean{

    const parts=storedHash.split(':');
    if(parts.length!==2) return false;
    const [salt , hash]=parts;
    const checkHash=crypto.pbkdf2Sync(password , salt , 1000 , 6 , 'sha512').toString('hex');
    return hash===checkHash;

}

export class AuthService{
    static async register(email:string , passwordPlain:string , orgName?:string){

        // check user is exsit or not

        const existing =await prisma.user.findUnique({
            where:{email}
        });

        if(existing){
            throw new Error("User with this email already exists.")
        }

        const passwordHash=hashPassword(passwordPlain);

        return await prisma.$transaction(async(tx)=>{
            const org=await tx.organization.create({
                data:{
                    name:orgName || `${email.split('@')[0]}'s Workspace`,
                },
            });
            const user=await tx.user.create({
                data:{
                    email,
                    passwordHash,
                    organizationId:org.id,
                },
            });
            return {user , organization:org};
        });

    }

    static async login(email:string , passwordPlain:string){
        const user=await prisma.user.findUnique({
            where:{email}
        });
        if(!user){
            throw new Error ("Invalid email or password.' ")
        }
        const isValid=verifyPassword(passwordPlain , user.passwordHash);

        if(!isValid){
            throw new Error('Invalid password.');
        }
        return user;

    }
}