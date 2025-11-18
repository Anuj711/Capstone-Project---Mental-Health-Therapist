Usage:
Include the service-account.json in root
Include .env.local in root

Install npm
1. npm install
2. Install latest node v24.11.1 - visit https://nodejs.org/en or download nvm:
    nvm install node
Run Next.js Server:
3. npm run dev

Troubleshooting:
1) npm i next@canary		//update next js

2) npm audit fix		//fix package issues

3) "Error saving to database: Cannot read properties of undefined (reading 'prototype')" 
This issue is caused by running Node v25 or later.
2 solutions:
i) Install node v24.11.1
ii) Patch method
Go to this file:
node_modules/buffer-equal-constant-time/index.js (line 37)

Make this change:
-var Buffer = require('buffer').Buffer; // browserify
-var SlowBuffer = require('buffer').SlowBuffer;
+const bufferMod = require('buffer');
+const Buffer = bufferMod.Buffer; // browserify
+const SlowBuffer = bufferMod.SlowBuffer || Buffer;

Terminal run:
npx patch-package buffer-equal-constant-time