#!/usr/bin/env node
// 给 /edit 开帐号 / 重设密码：生成一次性链接，对方打开后自己设密码(密码不经过任何人)。
// 用法:node edit-worker/invite.mjs <用户名> "<显示的名字>" [admin|editor]
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [username, name, role = 'editor'] = process.argv.slice(2);
if (!/^[a-z0-9._-]{3,30}$/.test(username || '') || !name) {
  console.error('用法:node edit-worker/invite.mjs <用户名(小写英文)> "<显示的名字>" [admin|editor]');
  process.exit(1);
}
const token = randomBytes(24).toString('base64url');
const dir = path.dirname(fileURLToPath(import.meta.url));
execFileSync('npx', ['-y', 'wrangler@4.167.0', 'kv', 'key', 'put', '--binding', 'KV', '--remote', '--ttl', String(7 * 86400),
  `invite:${token}`, JSON.stringify({ username, name, role })], { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`✓ ${name}(${username},${role})的设定密码链接,7 天内有效、只能用一次：`);
console.log(`  https://alwinlim.com/edit/#/invite/${token}`);
