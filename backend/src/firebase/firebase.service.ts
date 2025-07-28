import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as path from 'path';
import * as crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

@Injectable()
export class FirebaseService implements OnModuleInit {
    private logger = new Logger(FirebaseService.name);
    private db: admin.firestore.Firestore;
    
    private readonly PBKDF2_ITERATIONS = 100000; 
    private readonly PBKDF2_KEY_LENGTH = 64;
    private readonly PBKDF2_DIGEST = 'sha512';

    async onModuleInit() {
        const serviceAccountPath = path.join(__dirname, '../../firebase/serviceAccountKey.json');
        const serviceAccount = require(serviceAccountPath) as ServiceAccount;

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.projectId
        });

        this.db = admin.firestore();
    }

    private hashCnp(cnp: string): string {
        return crypto.pbkdf2Sync(
            cnp, 
            process.env.PBKDF2_SALT!,
            this.PBKDF2_ITERATIONS, 
            this.PBKDF2_KEY_LENGTH, 
            this.PBKDF2_DIGEST
        ).toString('hex');
    }

    async storeCnpIdentityMapping(cnp: string, identityCommitment: string, groupId: number): Promise<void> {
        const hashedCnp = this.hashCnp(cnp);
        const data = { identityCommitment, groupId };
        await this.db.collection('cnpIdentityMappings').doc(hashedCnp).set(data);
        this.logger.log(`Stored identity mapping for CNP with groupId: ${groupId}.`);
    }

    async getIdentityCommitmentByCnp(cnp: string): Promise<string | null> {
        const hashedCnp = this.hashCnp(cnp);
        const doc = await this.db.collection('cnpIdentityMappings').doc(hashedCnp).get();
        return doc.exists ? doc.data()?.identityCommitment : null;
    }

    async getGroupIdByCnp(cnp: string): Promise<number | null> {
        const hashedCnp = this.hashCnp(cnp);
        const doc = await this.db.collection('cnpIdentityMappings').doc(hashedCnp).get();
        return doc.exists ? doc.data()?.groupId : null;
    }

    async getIdentityMappingByCnp(cnp: string): Promise<{identityCommitment: string, groupId: number} | null> {
        const hashedCnp = this.hashCnp(cnp);
        const doc = await this.db.collection('cnpIdentityMappings').doc(hashedCnp).get();
        if (doc.exists) {
            const data = doc.data()!;
            return {
                identityCommitment: data.identityCommitment,
                groupId: data.groupId
            };
        }
        return null;
    }

}
