# SWAYAM Enrollment Management System

This project allows teachers to track student enrollments on the SWAYAM portal.

## Setup Instructions

### 1. Backend Setup
```bash
cd server
npm install
node server.js
```
The server will run on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The application will run on `http://localhost:5173`.

## Usage
- **Students:** Fill the form at the root URL (`/`) and upload a screenshot of their enrollment.
- **Teachers:** Access the dashboard at `/teacher` to view all submissions and verify screenshots.

## Features
- Student data collection (Name, Roll No, Course, Enrollment Status).
- Screenshot upload for proof.
- Dashboard with real-time refresh.
- Filterable and responsive interface.
