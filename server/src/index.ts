import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import institutionRoutes from './routes/institution.routes';
import employeeRoleRoutes from './routes/employeeRole.routes';
import employeeRoutes from './routes/employees.routes';
import admissionCycleRoutes from './routes/admissionCycle.routes';
import deegreeLevelRoutes from './routes/deegreeLevel.routes';
import programmeRoutes from './routes/programme.routes';
import schoolRoutes from './routes/school.routes';
import departmentRoutes from './routes/department.routes';
import batchRoutes from './routes/batch.routes';
import enquiryFormRoutes from './routes/enquiryform.routes';
import undertakingTemplateRoutes from './routes/undertakingTemplate.routes';
import studentUndertakingRoutes from './routes/studentUndertaking.routes';
import leadRoutes from './routes/lead.routes';
import counsellorRoutes from './routes/counsellor.routes';
import callLogRoutes from './routes/callLog.routes';
import reportRoutes from './routes/report.routes';
import studentApplicationRoutes from './routes/studentApplication.routes';
import applicationRoutes from './routes/application.routes';
import institutionFinanceConfigRoutes from './routes/institutionFinanceConfig.routes';
import feeCategoryRoutes from './routes/feeCategory.routes';
import applicationFeeRoutes from './routes/applicationFee.routes';
import documentVerificationRoutes from './routes/documentVerification.routes';
import { errorHandler } from './middleware/errorHandler';
import { testDatabaseConnection } from './config/database';




dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CORS_ORIGIN
];

app.use(
  cors({
    origin: function (origin, callback) {

      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parses the incoming JWT cookie

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'AU-ERP CRM Server is running' });
});

app.get('/', (_req, res) => {
  res.send(`
    <h1>Welcome to the AU-ERP CRM Server</h1>
    <h2>Server is running and ready to accept API requests</h2>
  `);
});
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/employee-roles', employeeRoleRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admission-cycles', admissionCycleRoutes);
app.use('/api/degree-levels', deegreeLevelRoutes);
app.use('/api/programmes', programmeRoutes);
app.use('/api/programme', programmeRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/enquiryform', enquiryFormRoutes);
app.use('/api/undertaking-templates', undertakingTemplateRoutes);
app.use('/api/student-undertakings', studentUndertakingRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/counsellors', counsellorRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api', reportRoutes);
app.use('/api/student-application', studentApplicationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/institution-finance-config', institutionFinanceConfigRoutes);
app.use('/api/feecategory', feeCategoryRoutes);
app.use('/api/application-fee', applicationFeeRoutes);
app.use('/api/document-verification', documentVerificationRoutes);


//Test S3 upload route
app.use('/api/s3test', require('./controllers/s3test.controllers').default);
// ── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server and test database ──────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  const dbConnected = await testDatabaseConnection();
  console.log(`Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);
});
