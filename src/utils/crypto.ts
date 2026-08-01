import crypto from 'crypto';
const ALGORITHM='aes-256-gcm';

if (!process.env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
}
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

export function encryptCredential(text:string):string{
    /*
    IV (Initialization Vector): A random string of bytes added to the encryption process. It ensures that if two users save the exact same OpenAI key, the encrypted outputs will still look completely different in the database.
    */
   //

   // Generate a random 12-byte IV

   const iv=crypto.randomBytes(12);


    // Create the cipher using the algorithm, our master key, and the IV
   const cipher=crypto.createCipheriv(ALGORITHM , ENCRYPTION_KEY , iv);

   // Encrypt the text
   let encrypted=cipher.update(text ,'utf-8' , 'hex');
    

   encrypted += cipher.final('hex');

   // Extract the tamper-evident authentication tag
   const authTag=cipher.getAuthTag().toString('hex');

   // We store the IV, AuthTag, and Encrypted Text together separated by colons so we can decrypt it later
   return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    
}

export function decryptCredential(encryptedDataString:string):string{

    const parts=encryptedDataString.split(':');

    const iv=Buffer.from(parts[0],'hex');
    const authTag=Buffer.from(parts[1] ,'hex');
    const encryptedText=parts[2];

    const decipher=crypto.createDecipheriv(ALGORITHM , ENCRYPTION_KEY , iv);

    decipher.setAuthTag(authTag);

    let decrypted=decipher.update(encryptedText , 'hex' , 'utf-8');
    decrypted+=decipher.final('utf-8');
    return decrypted;
}