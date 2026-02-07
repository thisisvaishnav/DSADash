import http from "http";

import { db } from "./core/database/db.client"; 
import { redis } from "./core/queue/redis.client";
import { socketManager } from "./core/socket/socket.manager";   
import { corsConfig } from "./config/cors.config";
import { socketConfig } from "./config/socket.config";
import { authRouter } from './features/auth/auth.routes';     

export const io = socketManager.init(server);

app.use(cors(corsConfig));
app.use(authRouter);   
const server = http.createServer(app);      

server.listen(3000, () => {
  console.log(`Server running on http://localhost:3000`);
});
