# Job Portal with Resume Builder 🚀

A full-stack MERN (MongoDB, Express.js, React.js, Node.js) application designed for candidates and employers to connect, post jobs, manage applications, and build professional resumes.

---

## 📅 Internship Roadmap Progress

- [x] **Day 1: Base Project Architecture Setup** (Monorepo structure, Express server, Mongoose setup, Health check endpoint, React client setup, CORS, .env configuration)
- [ ] **Day 2-27**: Core business features (Auth, Roles, Job Postings, Resume Builder, Applications, Email Notifications, etc.)

---

## 🛠️ Tech Stack

- **Frontend**: React.js (built with Vite), CSS3 Vanilla Design System
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Object Data Modeling via Mongoose)
- **HTTP & Utilities**: Express CORS, Dotenv

---

## 📂 Project Structure

```text
Job Portal/
├── client/                     # Frontend React Application (Vite)
│   ├── src/
│   │   ├── App.jsx             # Health check verification dashboard UI
│   │   ├── index.css           # Global design tokens and styles
│   │   └── main.jsx            # Application entry point
│   ├── package.json            # Client dependencies
│   └── .gitignore              # Client ignore rules
│
├── server/                     # Backend Node.js / Express API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Mongoose MongoDB connection helper
│   │   ├── controllers/
│   │   │   └── healthController.js # Health check endpoint handler
│   │   ├── middleware/
│   │   │   └── errorHandler.js # Express global error middleware
│   │   ├── models/             # Mongoose schemas placeholder (Day 2+)
│   │   ├── routes/
│   │   │   └── healthRoutes.js # Route mapping for /api/health
│   │   ├── services/           # Business logic layer placeholder (Day 2+)
│   │   └── server.js           # Express app bootstrap & initialization
│   ├── .env.example            # Environment variable template (Secrets safe)
│   ├── .env                    # Local environment config (DO NOT COMMIT)
│   ├── package.json            # Server dependencies
│   └── .gitignore              # Server ignore rules
│
├── .gitignore                  # Global git ignore configuration
└── README.md                   # Project documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- MongoDB installed locally OR a MongoDB Atlas cluster URI

---

### Step 1: Install Dependencies

1. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

---

### Step 2: Environment Setup

1. In the `server` directory, copy `.env.example` to `.env`:
   ```bash
   cd server
   cp .env.example .env
   ```
   *(Or copy manually on Windows)*

2. Configure `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://127.0.0.1:27017/job_portal
   CLIENT_URL=http://localhost:5173
   ```
   > ⚠️ **Security Note:** Never commit `.env` files to git. `.env` is listed in `.gitignore`.

---

### Step 3: Run the Application

1. **Start the Express Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   *The server will run on `http://localhost:5000`.*

2. **Start the React Frontend Client:**
   *(In a separate terminal tab/window)*
   ```bash
   cd client
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`.*

---

## 🧪 API Health Check Verification

Once both servers are running, test the backend health check endpoint:

- **Endpoint**: `GET /api/health`
- **URL**: `http://localhost:5000/api/health`
- **Sample JSON Response**:
  ```json
  {
    "status": "OK",
    "message": "Job Portal API is operational",
    "timestamp": "2026-10-08T12:00:00.000Z",
    "uptime": "15s",
    "database": {
      "status": "connected"
    },
    "environment": "development"
  }
  ```

---

## 🔒 Security Best Practices Implemented
- Dynamic environment variable parsing via `dotenv`.
- Credentials excluded from version control using `.gitignore`.
- Explicit CORS whitelist restricting access to trusted frontend client URLs.
