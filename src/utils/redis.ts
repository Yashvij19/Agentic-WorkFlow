import { RedisConnection } from "bullmq";
import Redis from "ioredis";


const Redis_URL=process.env.Redis_URL||"redis://localhost:6379";


// We create a shared connection instance
export const redisConnection=new Redis(Redis_URL,{
    maxRetriesPerRequest:null, // Required by BullMQ
    enableReadyCheck:false,
});


redisConnection.on('connect',()=>{
    console.log('🔗 Connected to Redis Ticket Rail.')
});

redisConnection.on('error',(err)=>{
    console.error('❌ Redis Connection Error:', err);
});