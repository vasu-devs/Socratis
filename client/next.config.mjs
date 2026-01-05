import nextEnv from '@next/env';
import path from 'path';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(path.resolve(process.cwd(), '..'));

const nextConfig = {};

export default nextConfig;
