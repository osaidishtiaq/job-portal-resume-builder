# Job Portal with Resume Builder 🚀

A full‑stack MERN (MongoDB, Express, React, Node.js) application that connects **candidates** with **employers**. It includes a client‑side resume builder with downloadable PDF templates.

---

## 1. Project Title & Overview
**Job Portal with Resume Builder**

The project provides:
- User authentication with role‑based access (candidate & employer).
- Job posting, browsing, applying, and status tracking.
- A resume builder offering three professional templates (Professional, Minimal, Modern) that can be exported as PDF on the client using **jsPDF**.
- Email notifications (via Nodemailer) for password recovery and when a candidate applies for a job.

---

## 2. Key Features
### Candidate
- Register / login (JWT authentication).
- Manage personal profile.
- Browse, search and filter jobs.
- View job details and submit applications.
- Track application status.
- Build a resume with three templates and export to PDF.
- Request password reset via email.

### Employer
- Register / login.
- Manage employer profile.
- Create, edit, close job postings.
- View *My Jobs* dashboard.
- Review applicants, update their status, and the system sends an email notification to the employer when a candidate submits an application.

### Account Security
- JWT‑based authentication with role‑based authorisation.
- Password recovery via email (single‑use, time‑limited token).
- Authenticated password change.
- Secure storage of secrets in `.env` files (never committed).

---

## 3. Technology Stack
| Layer | Technology |
|------|------------|
| **Frontend** | React 19 (Vite), jsPDF, oxlint (linting) |
| **Backend** | Node.js **20.19+**, Express 4, Mongoose 8 |
| **Database** | MongoDB (local or Atlas) |
| **Auth** | JSON Web Tokens (jsonwebtoken) |
| **Email** | Nodemailer |
| **Testing** | Node.js built‑in test runner (`node --test`), in‑memory MongoDB (`mongodb-memory-server`) |
| **Package Manager** | npm |

---

## 4. Project Folder Structure
```text
Job Portal/
├── client/                     # React front‑end (Vite)
│   ├── src/                    # Source files (components, pages, etc.)
│   ├── public/                 # Static assets
│   ├── .env.example            # Front‑end env template (VITE_API_URL)
│   ├── package.json            # Front‑end scripts & dependencies
│   └── ...
├── server/                     # Express back‑end
│   ├── src/                    # Server code (config, controllers, models, routes, services)
│   ├── .env.example            # Back‑end env template
│   ├── package.json            # Back‑end scripts & dependencies
│   └── ...
├── .gitignore
└── README.md                   # **This documentation**
```

---

## 5. Prerequisites
- **Node.js** – version **20.19** or newer (required by Vite 8).
- **npm** (shipped with Node)
- **MongoDB** – local installation or an Atlas connection string.
- **Git** (for cloning the repository).
- A terminal that supports PowerShell commands (Windows).

---

## 6. Installation
```powershell
# 1️⃣ Clone the repository
git clone https://github.com/osaidishtiaq/job-portal-resume-builder
cd job-portal-resume-builder

# 2️⃣ Server dependencies
cd server
npm install

# 3️⃣ Client dependencies
cd ..\client
npm install   # or "pnpm install"
```
> **Note** – The placeholder `<repo-url>` should be replaced with the real GitHub URL when known.

---

## 7. Environment Configuration
### 7.1 Copy example files
```powershell
# Server side
cd server
copy .env.example .env   # Windows `copy`, on *nix `cp`

# Client side
cd ..\client
copy .env.example .env   # creates `VITE_API_URL`
```
### 7.2 Server `.env` variables (required)
| Variable | Description |
|----------|-------------|
| `PORT` | Port the Express server listens on (default **5000**). |
| `NODE_ENV` | Environment mode (`development` or `production`). |
| `MONGO_URI` | MongoDB connection string (local or Atlas). |
| `CLIENT_URL` | Front‑end URL for CORS (default **http://localhost:5173**). |
| `JWT_SECRET` | Secret key for signing JWTs. |
| `JWT_EXPIRES_IN` | JWT expiry (e.g., `7d`). |
| `SMTP_HOST` | Hostname of the SMTP server used for email notifications. |
| `SMTP_PORT` | Port of the SMTP server (usually **587** or **465**). |
| `SMTP_USER` | Username for SMTP authentication. |
| `SMTP_PASS` | Password for SMTP authentication. |
| `SMTP_FROM` | Email address used as the sender (e.g., `no-reply@example.com`). |

### 7.3 Client `.env` variables (required)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the back‑end API (default **http://localhost:5000/api**). |

> **Security reminder** – Never commit `.env` files. They are listed in `.gitignore`.

---


### Production Transactional Email (Brevo)

Production email delivery uses the Brevo HTTPS transactional API when
`BREVO_API_KEY` is configured on the backend.

- Set `BREVO_API_KEY` in Render's backend environment variables.
- Set `SMTP_FROM` to a sender email address verified in Brevo.
- Ensure the API key has permission to send transactional emails.
- If `BREVO_API_KEY` is absent, the application falls back to SMTP.
- Do not commit API keys, SMTP passwords, or `.env` files.

## 8. Running the Application Locally
Open **two** PowerShell windows (or tabs).
### Backend
```powershell
cd server
npm run dev   # starts the server with nodemon on http://localhost:5000
```
The console will display:
```
🚀 Server running on port 5000
🌐 Health check: http://localhost:5000/api/health
```
### Frontend
```powershell
cd client
npm run dev   # starts Vite dev server on http://localhost:5173
```
The client will automatically proxy API requests to the backend (`/api`).

---

## 9. Deployment

The application is deployed using Vercel for the frontend and Render for the backend.

- **Frontend:** https://job-portal-resume-builder-tau.vercel.app
- **Backend health endpoint:** https://job-portal-mentor-tech-api.onrender.com/api/health
- **Database:** MongoDB Atlas
- **Transactional email:** Brevo HTTPS API

---
## 10. How to Use
### Candidate workflow
1. Register or log in.
2. Complete your profile.
3. Browse jobs, filter or search as needed.
4. View a job’s details and click **Apply**.
5. Track your applications on the *My Applications* page.
6. Use the **Resume Builder** to create a resume, then click **Download PDF**.
7. Reset your password via the *Forgot password* link (email with a token is sent).

### Employer workflow
1. Register or log in as an employer.
2. Fill out the employer profile.
3. Create a new job posting (title, description, requirements, etc.).
4. Manage your listings under *My Jobs* – edit or close them.
5. Review incoming applications, update their status, and the system sends email notifications to candidates.

---

## 11. Testing & Verification
```powershell
# Backend automated tests
cd server
npm test   # runs "node --test"

# Front‑end linting
cd ..\client
npm run lint   # runs oxlint

# Front‑end production build
npm run build   # creates ./dist
```
**Verification (as of 2026‑10‑29):**
- Backend tests: **243 passed, 0 failed, 0 cancelled**
- Front‑end lint: **passed**
- Front‑end build: **passed**
- Password‑reset flow (Chrome): **15/15** test cases passed
- Resume PDF export (Chrome): **9/9** test cases passed
- Candidate‑to‑Employer integration (Chrome): **12/12** test cases passed

*These results were obtained from the existing test suite; they have not been re‑executed during this documentation update.*

---

## 12. Troubleshooting
## 12. Troubleshooting

| Issue | Possible Cause | Solution |
|---|---|---|
| Backend fails to start | Missing dependencies or environment variables | Run `npm install` inside `server` and verify the `.env` configuration. |
| MongoDB connection fails | Invalid `MONGO_URI` or Atlas network restrictions | Check the connection string, database credentials, and MongoDB Atlas network access settings. |
| Frontend cannot connect to backend | Incorrect `VITE_API_URL`, CORS configuration, or backend not running | Verify the backend URL, `CLIENT_URL`, and that the API server is running. |
| Port already in use | Another process is using port 5000 or 5173 | Stop the conflicting process or configure a different port. |
| Registration or login fails | Incorrect credentials, missing JWT configuration, or backend error | Verify the request details, `JWT_SECRET`, and backend logs. |
| Password reset email is not received | Invalid Brevo API key, unverified sender, or missing permissions | Verify `BREVO_API_KEY`, `SMTP_FROM`, and transactional email permissions. Check the spam folder and backend logs. |
| Resume PDF cannot be downloaded | Browser download restrictions or PDF generation error | Allow browser downloads, check the browser console, and retry. |
| Render backend responds slowly | Service cold start or temporary hosting delay | Wait briefly and retry the request. Check Render logs if the issue persists. |

### Additional Setup Tips

- Use Node.js and npm versions compatible with the project's dependencies.
- Install frontend and backend dependencies separately using `npm install`.
- Keep `.env` files private and never commit API keys, passwords, or database credentials.
- Restart development servers after changing environment variables.
- Run backend tests with `npm test` and frontend checks with `npm run lint` and `npm run build` from their respective directories.

---

## 13. Security & Notes
- **Never** commit real secrets. `.env` files are ignored by Git.
- The `.env.example` files contain placeholder values; replace them with real credentials before running.
- Email functionality requires a valid SMTP service; without it the API will still create resources but will skip sending mails.
- PDF generation is performed entirely on the client using **jsPDF** – no server endpoint is required.

---
