**To start the backend server:**
1. Obtain the appropriate ".env" file (available on request).
2. Place the ".env" file in the "/backend" directory.
3. Open a terminal and navigate to the "backend" directory.
4. In the terminal, run the "run.bat" file:

   _.\run.bat_

   
**To start the frontend and database server:**
1. Obtain the appropriate "service-account.json" and ".env" files (available on request).
2. Place the "service-account.json" and ".env" files in the "/frontend_and_database" directory.
3. Open a terminal and navigate to the "frontend_and_database" directory.
4. Install Node Package Manager (npm):

   _npm install_
5. Install and use Node.js version 24.x -- v24.11.1 is used here:

   _nvm install 24.11.1_

   _nvm use 24.11.1_
6. Verify the Node.js version currently being used:

   _node -v_
7. Run the Next.js Server:

   _npm run dev_


**Troubleshooting commands:**
1. To update an outdated version of Next.js:

   _npm i next@canary_

3. To fix package issues:

   _npm audit fix_

5. To fix an incompatible version of Node (v25 or later), "Error saving to database: Cannot read properties of undefined (reading 'prototype')": 
Install node v24.11.1 (refer above to step 5 in starting the frontend and database server).
