import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://neondb_owner:npg_3UeVGMk6lDEF@ep-delicate-water-ahwvsfhl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  },
});