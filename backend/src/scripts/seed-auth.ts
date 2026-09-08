import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../services/auth/password.service';

const password = 'Demo@12345';

const demoAccounts = [
  {
    name: 'Platform Admin',
    email: 'admin@example.com',
    phone: '+91 9000000001',
    role: 'ADMIN' as const,
  },
  {
    name: 'Demo Shipper',
    email: 'shipper@example.com',
    phone: '+91 9000000002',
    role: 'SHIPPER' as const,
  },
  {
    name: 'Demo Transporter',
    email: 'transporter@example.com',
    phone: '+91 9000000003',
    role: 'TRANSPORTER' as const,
  },
];

async function seedAuthentication(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Demo seed scripts cannot run in production');
  }

  await connectDatabase();
  const passwordHash = await hashPassword(password);

  await Promise.all(
    demoAccounts.map((account) =>
      UserModel.updateOne(
        { email: account.email },
        {
          $set: {
            ...account,
            passwordHash,
            isActive: true,
          },
        },
        { upsert: true },
      ),
    ),
  );

  console.log('Demo authentication accounts are ready.');
}

void seedAuthentication()
  .catch((error: unknown) => {
    console.error('Authentication seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
