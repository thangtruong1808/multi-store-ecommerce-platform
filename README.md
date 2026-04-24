# Multi-Store-Ecommerce-Platform

Full-stack starter project with:
- Frontend: React 18 + Vite + TailwindCSS
- Backend: ASP.NET Core Web API (C#)
- Root command to run both frontend and backend together

## Project Structure

- `frontend`: React 18 app with TailwindCSS
- `backend`: ASP.NET Core Web API
- `package.json`: root scripts to run services together

## Prerequisites

- Node.js 18+ and npm
- .NET SDK 8.0+

## Environment Files

Copy examples if needed:

- `frontend/.env.example` -> `frontend/.env`
- `backend/.env.example` -> `backend/.env`

Current env keys:

Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: backend base URL (default `http://localhost:5080`)

Backend (`backend/.env`)
- `ASPNETCORE_ENVIRONMENT`: runtime environment
- `ASPNETCORE_URLS`: backend URL binding
- `CORS_ALLOWED_ORIGINS`: allowed frontend origins (comma-separated)
- `ConnectionStrings__Default`: sample database connection string

## Install

```bash
npm install
npm install --prefix frontend
```

## Run Both Servers

From project root:

```bash
npm run dev
```

This starts:
- Frontend (Vite): `http://localhost:5173`
- Backend (ASP.NET): `http://localhost:5080`

## Run Services Separately

```bash
npm run dev:frontend
npm run dev:backend
```

## API Health Check

After backend starts:

- `GET http://localhost:5080/api/health`
