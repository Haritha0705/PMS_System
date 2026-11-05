# PMS-prestige_glamour_group_of_company
# PMS Application - Payroll Management System

**Comprehensive Payroll Management Web Application** built with React, Node.js, and PostgreSQL.

**Version:** 1.0.0  
**Company:** Prestige & Glamour Group of Companies  
**Status:** Production Ready

---

## 🚀 Quick Start

### Features at a Glance
- ✅ Employee management across multiple branches
- ✅ Complex salary calculations (2 role categories)
- ✅ Bulk PDF payslip generation (concurrent processing)
- ✅ Dot matrix printer support (ESC/P compatible)
- ✅ Multi-format export (Excel, PDF, TXT)
- ✅ Role-based access control
- ✅ Real-time progress tracking
- ✅ Desktop & Web-based interface

### First Login
The first admin (username `admin`) is created on an empty database with the password in
`ADMIN_INITIAL_PASSWORD`. This variable is required in production; local development falls
back to `admin123`. Change the password from **Account → Change Password** after signing in.

`DATABASE_URL` must be set in `.env` or your hosting settings. When hosting behind more than
one proxy, set `TRUST_PROXY_HOPS` so login rate limits apply per visitor.

Bulk **Print** uses the printer attached to the server, so it is off in production unless
`SERVER_PRINT_ENABLED=true`. On hosted servers, download the ZIP and print from your computer.

---

## 📦 Installation

### Prerequisites
- Node.js v22.12+
- PostgreSQL (Neon recommended)
- Chrome/Chromium for PDF generation

### Installation Steps

```bash
# Clone and install
git clone <repo-url>
cd PMS
npm install

# Setup environment
cd server
cp .env.example .env  # Configure your DATABASE_URL
npm install

cd ../client
npm install
```

### Start Development

**Terminal 1 - Backend:**
```bash
cd server && npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client && npm run dev
```

**Production (build once, then serve UI + API on http://localhost:4500):**
```bash
npm run build
npm start
```

---

## 📋 Key Features

### 1. Employee Management
- CRUD operations for employee records
- Multi-branch support
- Salary structure assignment
- Status tracking (active/deleted)

### 2. Monthly Paysheet Generation
- Comprehensive data entry form
- Support for:
  - Achievement percentage (sales roles)
  - Custom allowances and deductions
  - No-pay and late arrival tracking
  - EPF/ETF management
  - Welfare and other offers

### 3. Payroll Calculation Engine
**Two Role Categories:**

**Category A - Sales Based:**
- General Manager, Regional Manager, Branch Manager, BDE, etc.
- Calculation includes: Achievement bonus, Vehicle/Fuel allowance, ORC, Deductions

**Category B - Non-Target:**
- HR & Finance Head, Manager Admin, Finance Executive, etc.
- Fixed salary structure with allowances

**Key Constants:**
- Working Days/Month: 25 days
- Working Hours/Day: 8 hours
- EPF Employee: 8%, Employer: 12%
- ETF: 3%

### 4. Bulk PDF Generation & Printing
- **Generate:** Select month → choose employees → configure concurrency (1-10 workers)
- **Download:** Automatic ZIP archive of all payslips
- **Print:** Direct printing to physical printers
- **Progress:** Real-time job tracking with status updates

  1. dist/PMS Application Setup 1.0.0.exe — NSIS installer (with install directory choice, desktop shortcut, etc.)
  2. dist/PMS Application-1.0.0-win.zip — ZIP portable version
  3. dist/PMS Application 1.0.0.exe — Portable executable
```
UI Path: Payroll → Bulk PDF Export
API: POST /api/payslips/generate 
     GET /api/payslips/progress/:jobId
     GET /api/payslips/download/:jobId
```

 Bulk PDF Export
### 5. Dot Matrix Printing
- Legacy printer support
- **Formats:** Standard & ESC/P (Epson compatible)
- **Output:** .txt / .prn files
- **Direct Printing:** Send directly to dot matrix printers

  - UI: Payroll page → "Bulk PDF Export" tab
  - Flow: Select month → configure workers (1-10) → generate → download ZIP of all payslips
  - API: POST /api/payslips/generate → poll progress → GET /api/payslips/download/:jobId
  - Also supports: direct printing to a connected printer
```
UI Path: Dot Matrix Printing page
API: POST /api/dot-matrix/generate
     GET /api/dot-matrix/download/:jobId
     POST /api/dot-matrix/print
```

  Bulk Dot Matrix Printing
### 6. Data Export
- **Employees Export** → All employee records (Excel)
- **Paysheets by Role** → Grouped by job designation (Excel)
- **Paysheets by Branch** → Grouped by location (Excel)

  - UI: Dedicated DotMatrixPrinting page
  - Flow: Select month → toggle ESC/P mode (for Epson printers) → generate → download .txt/.prn file
  - API: POST /api/dot-matrix/generate → poll status → GET /api/dot-matrix/download/:jobId
  - Also supports: direct printing to a dot matrix printer
### 7. Dashboard
- Active/Total employee count
- Branch statistics
- Total monthly salary expenditure
- Current month paysheet count

  Both use worker threads for parallel processing with progress tracking and error handling. The worker path bug we just fixed was preventing these from working
  — they should now work correctly in both development and production (packaged .exe).
---

## 🏗️ Project Structure

```
PMS/
├── client/              # React Frontend (Vite)
│   ├── src/
│   │   ├── pages/       # Dashboard, Users, Payroll, Export, DotMatrix
│   │   ├── components/  # Layout, Forms, Toast, NetworkStatus
│   │   ├── services/    # API communication
│   │   ├── hooks/       # usePayroll, usePaysheets, useUsers
│   │   ├── context/     # AuthContext
│   │   └── types/       # TypeScript interfaces
│   └── package.json
│
├── server/              # Express Backend (Node.js)
│   ├── src/
│   │   ├── controllers/ # Routes: auth, users, payroll, payslips, etc.
│   │   ├── services/    # Business logic & calculations
│   │   ├── middleware/  # JWT auth, logging
│   │   ├── engine/      # Salary calculator
│   │   ├── templates/   # PDF & Payslip templates
│   │   ├── workers/     # Worker threads (PDF, DotMatrix)
│   │   ├── validation/  # Zod schemas
│   │   └── utils/       # Logging, Chrome path resolution
│   ├── data/            # JSON data stores
│   ├── exports/         # Generated files
│   └── package.json
│
└── build/               # Icons and build artifacts
```

---

## 🔌 API Endpoints

### Base URL: `http://localhost:4500/api`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Authenticate user |
| GET/POST | `/users` | Manage employees |
| GET/POST | `/payroll` | Payroll records |
| GET/POST | `/paysheets` | Monthly paysheets |
| POST | `/payslips/generate` | Start PDF generation |
| GET | `/payslips/progress/:jobId` | Get job progress |
| GET | `/payslips/download/:jobId` | Download PDF ZIP |
| POST | `/dot-matrix/generate` | Generate dot matrix files |
| GET | `/export/users/excel` | Export employees |
| GET | `/export/paysheets/role` | Export by role |
| GET | `/export/paysheets/branch` | Export by branch |

---

## 📦 Build & Distribution

### Create Installers

```bash
# Build all components
npm run build:all

# Windows installer & portable
npm run build:win

# macOS DMG
npm run build:mac

# All distributions
npm run dist
```

**Output formats:**
- NSIS Installer (.exe with uninstaller)
- Portable ZIP (.zip)
- Portable Executable (.exe)
- macOS DMG (.dmg)
- Linux AppImage (.AppImage)

---

## 🛠️ Technology Stack

### Frontend
- React 19.2.4
- TypeScript 5.9.3
- Vite 8.0.1
- React Router 7.13.2
- Axios 1.13.6
- Recharts 2.15.4
- ESLint 9.39.4

### Backend
- Express.js 4.18.2
- TypeScript 5.3.2
- PostgreSQL (Neon)
- Puppeteer 24.40.0 (PDF)
- ExcelJS 4.4.0
- JWT 9.0.2
- bcryptjs 2.4.3
- Winston 3.19.0
- Zod 4.3.6

---

## ⚙️ Environment Configuration

### Server `.env` file

```env
DATABASE_URL=postgresql://user:password@host/pms_db
PORT=4500
NODE_ENV=development

JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

OUTPUT_DIR=./exports
CHROME_PATH=/path/to/chrome  # Optional, auto-detected
```

### Supported Branches
- Colombo
- Kandy
- Galle
- Jaffna
- Maggona
- Negombo

---

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- bcryptjs password hashing (salt rounds: 10)
- CORS protection
- Zod input validation
- Role-based access control
- Token expiration & rotation

---

## 📊 Salary Calculation Example

**Sales Role (Category A) - Manager:**

```
Basic Salary:             100,000
Achievement Bonus (50%):   50,000
Vehicle Allowance:          5,000
Fuel Allowance:             3,000
General Allowance:          2,000
ORC:                          500
─────────────────────────────────
Gross:                    160,500

No-pay (2 days):           -8,000
Late (4 hours):            -2,000
EPF (8%):                 -12,840
ETF (3%):                  -4,815
─────────────────────────────────
Net Salary:               132,845
```

---

## 🐛 Troubleshooting

### PDF Generation Issues
- Ensure Chrome/Chromium is installed
- Set `CHROME_PATH` in `.env` if not auto-detected
- Check `/server/logs/` for errors

### Database Connection
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network connectivity

### Port Already in Use
```bash
lsof -i :4500  # Find process
kill -9 <PID>  # Kill process
# Or change PORT in .env
```

### Slow PDF Generation
- Reduce concurrency (set to 3-5 instead of 10)
- Ensure adequate system memory
- Check Chrome process isn't already running

---

## 📖 Full Documentation

See **README_COMPLETE.md** for comprehensive documentation including:
- Complete API reference
- Detailed salary calculation logic
- Database schema
- Development guide
- Advanced features
- Security best practices

---

## 📄 License

ISC License - See LICENSE file

---

## 👥 Company

**Prestige & Glamour Group of Companies**

**Version:** 1.0.0  
**Last Updated:** April 9, 2026  
**Status:** Production Ready
