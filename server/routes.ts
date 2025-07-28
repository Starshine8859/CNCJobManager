import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";

import { storage } from "./storage";
import { createJobSchema, loginSchema, insertUserSchema, insertColorSchema, insertColorGroupSchema } from "@shared/schema";
import { pool } from "./db";
import "./types";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const PgSession = ConnectPgSimple(session);
  
  app.use(session({
    store: new PgSession({
      pool: pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'cnc-job-manager-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to false for deployment compatibility
      httpOnly: true,
      sameSite: 'lax'
    },
    name: 'cnc-session' // Explicit session name
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.user || req.session.user.role === 'user') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.user || req.session.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/login", async (req, res) => {
    try {
      console.log('Login attempt:', req.body?.username);
      const { username, password } = loginSchema.parse(req.body);
      
      // Make username lookup case-insensitive
      const user = await storage.getUserByUsername(username.toLowerCase());
      console.log('User found:', user ? 'yes' : 'no');
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        console.log('Login failed: invalid credentials');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.user = user;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      console.log('Login successful for user:', user.username);
      res.json({ user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/me", async (req, res) => {
    if (req.session?.user) {
      // Fetch fresh user data from database to get updated role
      const freshUser = await storage.getUser(req.session.user.id);
      if (freshUser) {
        // Update session with fresh data
        req.session.user = freshUser;
        res.json({ user: { 
          id: freshUser.id, 
          username: freshUser.username, 
          role: freshUser.role 
        }});
      } else {
        res.status(401).json({ message: "User not found" });
      }
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Job routes
  app.get("/api/jobs", requireAuth, async (req, res) => {
    try {
      const { search, status } = req.query;
      console.log('Fetching jobs with search:', search, 'status:', status);
      const jobs = await storage.getAllJobs(
        search as string, 
        status as string
      );
      console.log('Found jobs:', jobs.length);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // Start job timer when opening job details
  app.post("/api/jobs/:id/start-timer", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req as any).user?.id;
      
      await storage.startJobTimer(jobId, userId);
      
      const job = await storage.getJob(jobId);
      broadcastToClients({ type: 'job_timer_started', data: { jobId, job } });
      
      res.json({ message: "Job timer started" });
    } catch (error) {
      console.error('Start timer error:', error);
      res.status(500).json({ message: "Failed to start job timer" });
    }
  });

  // Stop job timer when closing job details
  app.post("/api/jobs/:id/stop-timer", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      await storage.stopJobTimer(jobId);
      
      const job = await storage.getJob(jobId);
      broadcastToClients({ type: 'job_timer_stopped', data: { jobId, job } });
      
      res.json({ message: "Job timer stopped" });
    } catch (error) {
      console.error('Stop timer error:', error);
      res.status(500).json({ message: "Failed to stop job timer" });
    }
  });

  app.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const jobData = createJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      
      // Broadcast new job to all connected clients
      broadcastToClients({ type: 'job_created', data: job });
      
      res.json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid job data" });
    }
  });



  app.post("/api/jobs/:id/pause", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Pausing job:', id);
      await storage.pauseJob(id);
      
      const job = await storage.getJob(id);
      console.log('Job after pause:', job?.status);
      broadcastToClients({ type: 'job_updated', data: job });
      
      res.json({ message: "Job paused successfully", job });
    } catch (error) {
      console.error('Pause job error:', error);
      res.status(500).json({ message: "Failed to pause job" });
    }
  });

  app.post("/api/jobs/:id/resume", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Resuming job:', id);
      await storage.resumeJob(id);
      
      const job = await storage.getJob(id);
      console.log('Job after resume:', job?.status);
      broadcastToClients({ type: 'job_updated', data: job });
      
      res.json({ message: "Job resumed successfully", job });
    } catch (error) {
      console.error('Resume job error:', error);
      res.status(500).json({ message: "Failed to resume job" });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await storage.deleteJob(id);
      
      broadcastToClients({ type: 'job_deleted', data: { id } });
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  app.put("/api/materials/:id/progress", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completedSheets } = req.body;
      
      await storage.updateMaterialProgress(id, completedSheets);
      
      broadcastToClients({ type: 'material_updated', data: { id, completedSheets } });
      
      res.json({ message: "Material progress updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update material progress" });
    }
  });

  app.post("/api/materials/:id/add-sheets", requireAuth, async (req, res) => {
    try {
      const materialId = parseInt(req.params.id);
      const { additionalSheets, isRecut } = req.body;
      
      if (!additionalSheets || additionalSheets < 1) {
        return res.status(400).json({ message: "Additional sheets must be a positive number" });
      }
      
      await storage.addSheetsToMaterial(materialId, additionalSheets, isRecut);
      
      res.json({ message: "Sheets added successfully" });
    } catch (error) {
      console.error('Add sheets error:', error);
      res.status(500).json({ message: "Failed to add sheets" });
    }
  });

  // Update individual sheet status
  app.post("/api/materials/:materialId/sheets/:sheetIndex", requireAuth, async (req, res) => {
    try {
      const materialId = parseInt(req.params.materialId);
      const sheetIndex = parseInt(req.params.sheetIndex);
      const { status } = req.body;
      
      console.log('Updating sheet status:', { materialId, sheetIndex, status });
      
      await storage.updateSheetStatus(materialId, sheetIndex, status);
      
      broadcastToClients({ type: 'sheet_status_updated', data: { materialId, sheetIndex, status } });
      
      res.json({ message: "Sheet status updated" });
    } catch (error) {
      console.error('Update sheet status error:', error);
      res.status(500).json({ message: "Failed to update sheet status" });
    }
  });

  app.put("/api/materials/:id/sheet-status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sheetIndex, status } = req.body;
      
      await storage.updateSheetStatus(id, sheetIndex, status);
      
      broadcastToClients({ type: 'sheet_status_updated', data: { id, sheetIndex, status } });
      
      res.json({ message: "Sheet status updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update sheet status" });
    }
  });

  app.delete("/api/materials/:id/sheet/:sheetIndex", requireAuth, async (req, res) => {
    try {
      const materialId = parseInt(req.params.id);
      const sheetIndex = parseInt(req.params.sheetIndex);
      
      await storage.deleteSheet(materialId, sheetIndex);
      
      broadcastToClients({ type: 'sheet_deleted', data: { materialId, sheetIndex } });
      
      res.json({ message: "Sheet deleted successfully" });
    } catch (error) {
      console.error('Delete sheet error:', error);
      res.status(500).json({ message: "Failed to delete sheet" });
    }
  });

  // Add recut entry
  app.post("/api/materials/:id/recuts", requireAuth, async (req, res) => {
    try {
      const materialId = parseInt(req.params.id);
      const { quantity, reason } = req.body;
      const userId = (req as any).user?.id;
      
      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: 'Invalid recut quantity' });
      }
      
      await storage.addRecutEntry(materialId, quantity, reason, userId);
      
      broadcastToClients({ type: 'recut_added', data: { materialId, quantity, reason } });
      
      res.json({ message: 'Recut entry added successfully' });
    } catch (error) {
      console.error('Add recut error:', error);
      res.status(500).json({ message: 'Failed to add recut entry' });
    }
  });

  // Get recut entries for material
  app.get("/api/materials/:id/recuts", async (req, res) => {
    try {
      const materialId = parseInt(req.params.id);
      const recutEntries = await storage.getRecutEntries(materialId);
      res.json(recutEntries);
    } catch (error) {
      console.error('Get recuts error:', error);
      res.status(500).json({ message: 'Failed to fetch recut entries' });
    }
  });

  // Add material to existing job
  app.post("/api/jobs/:id/materials", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { colorId, totalSheets } = req.body;
      
      if (!colorId || !totalSheets || totalSheets < 1) {
        return res.status(400).json({ message: "Color ID and valid sheet count required" });
      }
      
      await storage.addMaterialToJob(jobId, colorId, totalSheets);
      
      broadcastToClients({ type: 'job_updated', data: { jobId } });
      
      res.json({ message: "Material added to job successfully" });
    } catch (error) {
      console.error('Add material to job error:', error);
      res.status(500).json({ message: "Failed to add material to job" });
    }
  });

  // Delete material from job
  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    try {
      const materialId = parseInt(req.params.id);
      
      await storage.deleteMaterial(materialId);
      
      broadcastToClients({ type: 'material_deleted', data: { materialId } });
      
      res.json({ message: "Material deleted successfully" });
    } catch (error) {
      console.error('Delete material error:', error);
      res.status(500).json({ message: "Failed to delete material" });
    }
  });

  // Delete individual recut entry
  app.delete("/api/recuts/:id", requireAuth, async (req, res) => {
    try {
      const recutId = parseInt(req.params.id);
      
      await storage.deleteRecutEntry(recutId);
      
      broadcastToClients({ type: 'recut_deleted', data: { recutId } });
      
      res.json({ message: "Recut entry deleted successfully" });
    } catch (error) {
      console.error('Delete recut error:', error);
      res.status(500).json({ message: "Failed to delete recut entry" });
    }
  });

  // Update recut sheet status
  app.put("/api/recuts/:id/sheet-status", requireAuth, async (req, res) => {
    try {
      const recutId = parseInt(req.params.id);
      const { sheetIndex, status } = req.body;
      
      await storage.updateRecutSheetStatus(recutId, sheetIndex, status);
      
      broadcastToClients({ type: 'recut_sheet_status_updated', data: { recutId, sheetIndex, status } });
      
      res.json({ message: "Recut sheet status updated" });
    } catch (error) {
      console.error('Update recut sheet status error:', error);
      res.status(500).json({ message: "Failed to update recut sheet status" });
    }
  });

  // Cutlist management routes
  app.post("/api/jobs/:id/cutlists", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { count } = req.body;
      
      if (!count || count < 1) {
        return res.status(400).json({ message: "Count must be at least 1" });
      }
      
      const cutlists = await storage.createCutlists(jobId, count);
      
      const job = await storage.getJob(jobId);
      broadcastToClients({ type: 'job_updated', data: job });
      
      res.json({ cutlists });
    } catch (error) {
      res.status(500).json({ message: "Failed to create cutlists" });
    }
  });

  app.delete("/api/cutlists/:id", requireAuth, async (req, res) => {
    try {
      const cutlistId = parseInt(req.params.id);
      
      await storage.deleteCutlist(cutlistId);
      
      broadcastToClients({ type: 'cutlist_deleted', data: { cutlistId } });
      
      res.json({ message: "Cutlist deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete cutlist" });
    }
  });

  // Color routes
  app.get("/api/colors", requireAuth, async (req, res) => {
    try {
      const { search } = req.query;
      let colors;
      
      if (search) {
        colors = await storage.searchColors(search as string);
      } else {
        colors = await storage.getAllColors();
      }
      
      res.json(colors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch colors" });
    }
  });

  app.post("/api/colors", requireAuth, async (req, res) => {
    try {
      const colorData = insertColorSchema.parse(req.body);
      const color = await storage.createColor(colorData);
      res.json(color);
    } catch (error) {
      res.status(400).json({ message: "Invalid color data" });
    }
  });

  app.put("/api/colors/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const colorData = insertColorSchema.partial().parse(req.body);
      await storage.updateColor(id, colorData);
      res.json({ message: "Color updated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid color data" });
    }
  });

  app.delete("/api/colors/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteColor(id);
      res.json({ message: "Color deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete color" });
    }
  });

  // Color group routes
  app.get("/api/color-groups", requireAuth, async (req, res) => {
    try {
      const groups = await storage.getAllColorGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch color groups" });
    }
  });

  app.post("/api/color-groups", requireAuth, async (req, res) => {
    try {
      const groupData = insertColorGroupSchema.parse(req.body);
      const group = await storage.createColorGroup(groupData);
      res.json(group);
    } catch (error) {
      res.status(400).json({ message: "Invalid group data" });
    }
  });

  app.put("/api/color-groups/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      await storage.updateColorGroup(id, name);
      res.json({ message: "Color group updated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid group data" });
    }
  });

  app.delete("/api/color-groups/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteColorGroup(id);
      res.json({ message: "Color group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete color group" });
    }
  });

  // User management routes (Super Admin only)
  app.get("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const { username, email, password, role } = insertUserSchema.parse(req.body);
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Check if username already exists (case-insensitive)
      const existingUser = await storage.getUserByUsername(username!);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username: (username || '').toLowerCase(), // Store username in lowercase
        email,
        password: hashedPassword,
        role: role || 'admin'
      });
      
      res.json({ id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt });
    } catch (error: any) {
      console.error('Create user error:', error);
      if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, password, role } = req.body;
      
      if (role && !['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      const updateData: any = {};
      
      // Handle username update with case-insensitive check
      if (username) {
        const lowerUsername = username.toLowerCase();
        // Check if this username is already taken by another user
        const existingUser = await storage.getUserByUsername(lowerUsername);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
        updateData.username = lowerUsername;
      }
      
      if (email !== undefined) updateData.email = email || null;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (role) updateData.role = role;

      const user = await storage.updateUser(userId, updateData);
      
      res.json({ id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt });
    } catch (error: any) {
      console.error('Update user error:', error);
      if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Prevent deleting yourself
      if (id === req.session.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });



  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const { sheetsFrom, sheetsTo, timeFrom, timeTo } = req.query;
      const stats = await storage.getDashboardStats(
        sheetsFrom as string | undefined,
        sheetsTo as string | undefined,
        timeFrom as string | undefined,
        timeTo as string | undefined
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Setup initial admin user
  app.post("/api/setup", async (req, res) => {
    
    try {
      // Check if any users exist
      console.log(req.body);
      const existingUsers = await storage.getAllUsers();
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Setup already completed" });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.createUser({
        username: username.toLowerCase(), // Store username in lowercase
        password: hashedPassword,
        role: 'super_admin'
      });
      res.json({ message: "Initial admin user created successfully" });
    } catch (error) {
      console.error('Setup error:', error);
      res.status(500).json({ message: "Setup failed" });
    }
  });

  app.get("/api/setup/required", async (req, res) => {
    try {
      const existingUsers = await storage.getAllUsers();
      res.json({ required: existingUsers.length === 0 });
    } catch (error) {
      console.error('Setup check error:', error);
      res.status(500).json({ message: "Failed to check setup status" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  function broadcastToClients(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
