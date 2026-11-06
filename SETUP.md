# Setup Guide (Windows)

This guide sets up the project on a new Windows computer. Run each command in **PowerShell**.

> **This project uses the real database.** Anything you add, edit or delete while running the app
> changes real payroll data. Never run `npm run seed` or any `prisma db` or `prisma migrate` command.
> The automated tests in step 4 are safe, because they use fake data.

## 1. Install the tools

Install these, then close and reopen PowerShell:

- [Node.js](https://nodejs.org) version **22.12 or newer**
- [Git](https://git-scm.com/download/win)

Check them:

```powershell
node -v
git --version
```

## 2. Download the project and install packages

```powershell
git clone https://github.com/Haritha0705/PMS_System.git
cd PMS_System

cd server
npm ci
npx prisma generate
npx puppeteer browsers install chrome
cd ..

cd client
npm ci
cd ..
```

If the repository is private, the owner must first give your GitHub account access.

## 3. Add the env files

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
```

The file `client\.env.desktop` is already in the project. Do not change it.

Open `server\.env` in a text editor and fill in these three values:

| Setting | What to enter |
|---|---|
| `DATABASE_URL` | The connection the project owner sends you privately |
| `JWT_SECRET` | A generated value (see below) |
| `REFRESH_SECRET` | A different generated value |

Run this twice, and use one result for each secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`client\.env` needs no changes.

## 4. Run the tests

These use fake data and do not touch the real database.

```powershell
cd server
npm test
npx tsc --noEmit
npm run lint
cd ..\client
npm test
npm run lint
cd ..
```

Everything should pass.

## 5. Run the app

Open **two** PowerShell windows.

**Window 1: server**

```powershell
cd server
npm run dev
```

**Window 2: website**

```powershell
cd client
npm run dev
```

Open <http://localhost:5173> and log in with the admin username and password from the project owner.

## 6. Build the Windows app

First install the desktop tools (needed once):

```powershell
cd desktop
npm ci
node node_modules\electron\install.js
cd ..
```

To try the desktop app without building it:

```powershell
cd server
npm run build
cd ..
npm run desktop:dev
```

To build the installer:

```powershell
npm run desktop:build
```

The installer is created at `desktop\release\PMS-Application-Setup-1.0.0.exe`. The first build
downloads Chrome and Electron, so it can take several minutes.

On first launch, the app asks for the database connection. Paste the same `DATABASE_URL`. It is
stored encrypted on that computer and is never included in the build.

## Common problems

| Problem | What to do |
|---|---|
| `npm ci` says a lock file is missing or out of date | Run `git pull`, then try again |
| Server stops with a database error | Check `DATABASE_URL` in `server\.env`, and check the internet connection |
| Website shows "Cannot connect to server" | Make sure the server window is still running |
| PDF download fails | In the `server` folder, run `npx puppeteer browsers install chrome` |
| Build fails with "Cannot create symbolic link" | Turn on **Settings → For developers → Developer Mode**, then build again |
| Windows shows "Windows protected your PC" | The app is unsigned. Click **More info → Run anyway** |

## Keep secrets private

Never commit or publicly share `server\.env` or the `DATABASE_URL`. Git already ignores `.env`, so
don't force-add it.
