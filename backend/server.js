console.log("SERVER STARTING...");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env"), override: true });
// Support the legacy env key already used by local installations.
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
console.log("Env loaded:", process.env.MONGO_URI ? "YES" : "NO");

console.log("Loading express...");
const express = require("express");
console.log("Loading cookie-parser...");
const cookieParser = require("cookie-parser");
console.log("Loading cors...");
const cors = require("cors");
console.log("Loading db...");
const connectDB = require("./config/db");
console.log("Loading errorMiddleware...");
const { errorHandler } = require("./middlewares/errorMiddleware");
console.log("Loading path...");
console.log("Loading helmet...");
const helmet = require("helmet");
console.log("Loading express-rate-limit...");
const rateLimitModule = require("express-rate-limit");
const rateLimit = rateLimitModule.rateLimit || rateLimitModule.default || rateLimitModule;
console.log("Loading morgan...");
const morgan = require("morgan");
console.log("Loading logger...");
const logger = require("./config/logger");

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://192.168.10.55:5173",
  "http://192.168.10.55:5174",
  "https://localhost:5173",
  "https://localhost:5174",
  "https://smartinstituteonline.com",
  "https://www.smartinstituteonline.com",
  "https://smar.smartinstituteonline.com",
  "https://api.smartinstituteonline.com",
];

// Security Middleware
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: {
    directives: {
      frameAncestors: ["'self'", ...allowedOrigins],
    },
  },
}));

// Helper to check if origin is allowed (supports exact match and subdomain patterns)
function isOriginAllowed(origin) {
  if (!origin) return true;

  // Exact match
  if (allowedOrigins.indexOf(origin) !== -1) return true;

  // Normalize by removing trailing slash
  const normalizedOrigin = origin.replace(/\/+$/, "");
  if (allowedOrigins.indexOf(normalizedOrigin) !== -1) return true;

  // Pattern match: smartinstituteonline.com and its subdomains
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (
      hostname === "smartinstituteonline.com" ||
      hostname.endsWith(".smartinstituteonline.com") ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }
  } catch (e) {
    // Invalid URL, fall through to rejection
  }

  return false;
}

const corsOptions = {
  origin: function (origin, callback) {
    const allowed = isOriginAllowed(origin);
    if (allowed) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  exposedHeaders: ["set-cookie"],
  optionsSuccessStatus: 204,
};

const setCorsHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
};

// CORS Middleware (Must be before Rate Limiter for 429s to work in browser)
app.use(setCorsHeaders);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);

// Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Middleware
// Imported final-exam question banks can contain hundreds of questions and
// legitimately exceed Express' default 100 KB JSON limit. Keep the higher
// limit scoped to this endpoint instead of weakening every API route.
app.use('/api/master/final-exam-question-paper', express.json({ limit: '10mb' }));
app.use(express.json());
app.use(cookieParser());

// Static Folder for Uploads
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => res.send("API is running..."));
app.get("/api", (req, res) => res.send("API is running..."));

app.use("/api/auth", require("./routes/authRoutes"));
app.use('/api/master/news', require('./routes/newsRoutes'));
app.use('/api/master/terms', require('./routes/termsRoutes'));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/master", require("./routes/masterRoutes"));
app.use("/api/transaction", require("./routes/transactionRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/user-rights", require("./routes/userRightRoutes"));
app.use("/api/visitors", require("./routes/visitorRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/awards", require("./routes/awardRoutes"));
app.use("/api/transaction/attendance", require("./routes/attendanceRoutes"));
app.use("/api/transaction/expenses", require("./routes/expenseRoutes"));
app.use("/api/transaction/expense-categories", require("./routes/expenseCategoryRoutes"));
app.use("/api/branches", require("./routes/branchRoutes"));
app.use("/api/cloudinary", require("./routes/cloudinaryRoutes"));
app.use("/api/materials", require("./routes/materialRoutes")); // Material Routes
app.use("/api/topper-results", require("./routes/topperResultRoutes")); // Topper Results Routes
app.use("/api/student-portal", require("./routes/studentPortalRoutes")); // New Student Portal Routes
app.use("/api/blogs", require("./routes/blogRoutes")); // Blog Routes
app.use("/api/banners", require("./routes/bannerRoutes")); // Banner Routes
app.use("/api/home-sections", require("./routes/homeSectionRoutes")); // Home Sections
app.use("/api/group-institutes", require("./routes/groupInstituteRoutes")); // Group Institute Links
app.use("/api/galleries", require("./routes/galleryRoutes")); // Gallery Routes
app.use("/api/feedback", require("./routes/feedbackRoutes")); // Feedback Routes
app.use("/api/sms", require("./routes/smsRoutes")); // SMS Routes
app.use("/api/complains", require("./routes/complainRoutes")); // Complain Routes
app.use("/api/contact", require("./routes/contactRoutes")); // Contact Routes
app.use("/api/admin-dashboard", require("./routes/adminDashboardRoutes")); // Admin Dashboard
app.use("/api/team", require("./routes/teamRoutes")); // Team Routes
app.use("/api/syllabus-logs", require("./routes/syllabusLogRoutes")); // Syllabus Progression Logs

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    console.log("Connecting to DB...");
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Server startup failed. MongoDB connection is required.");
    console.error(err);
    process.exit(1);
  }
};

startServer();
