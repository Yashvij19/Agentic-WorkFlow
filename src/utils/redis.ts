import { RedisConnection } from "bullmq";
import Redis from "ioredis";


const Redis_URL=process.env.Redis_URL||"redis://127.0.0.1:6379";


// We create a shared connection instance
export const redisConnection=new Redis(Redis_URL,{
    maxRetriesPerRequest:null, // Required by BullMQ
    enableReadyCheck:false,
});


//  The connection used by our Fastify server to listen to broadcasts
export const redisSubscriber=new Redis(Redis_URL);


//  The connection used by our Workers to broadcast their status
export const redisPublisher=new Redis(Redis_URL);

redisConnection.on('connect',()=>{
    console.log('🔗 Connected to Redis .')
});

redisConnection.on('error',(err)=>{
    console.error('❌ Redis Connection Error:', err);
});