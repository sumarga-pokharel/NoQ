import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Counter from '../models/Counter.js';
import { uniqueSlug } from '../utils/slugify.js';

const run = async () => {
  await connectDB();

  await Provider.deleteOne({ email: 'demo@ward16.gov.np' });

  const slug = await uniqueSlug('Ward 16 Office, Lalitpur');
  const provider = await Provider.create({
    officeName: 'Ward 16 Office, Lalitpur',
    slug,
    sector: 'government',
    email: 'demo@ward16.gov.np',
    phone: '9800000000',
    password: 'password123',
    address: 'Kupondole, Lalitpur',
    location: { lat: 27.6867, lng: 85.3197 },
    requiredDocuments: [
      { name: 'Citizenship certificate (original)', required: true },
      { name: 'Photocopy of citizenship', required: true },
    ],
    onboardingComplete: true,
  });

  const services = await Service.insertMany([
    { provider: provider._id, name: 'Property tax payment', avgMinutes: 8, prefix: 'B' },
    { provider: provider._id, name: 'Recommendation letter', avgMinutes: 5, prefix: 'R' },
    { provider: provider._id, name: 'Land ownership transfer', avgMinutes: 20, prefix: 'L' },
  ]);

  await Counter.insertMany([
    { provider: provider._id, name: 'Counter 1', compatibleServices: [services[0]._id] },
    { provider: provider._id, name: 'Counter 2', compatibleServices: [services[1]._id] },
    { provider: provider._id, name: 'Counter 3', compatibleServices: [] },
  ]);

  console.log('Seeded demo office:');
  console.log('  login: demo@ward16.gov.np / password123');
  console.log(`  public join link slug: ${slug}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
