<div align="center">

# CAREERGENIE

### AI-Powered Placement & Career Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/MONGODB-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/EXPRESS.JS-000000?style=for-the-badge&logo=express"/>
  <img src="https://img.shields.io/badge/REACT-61DAFB?style=for-the-badge&logo=react"/>
  <img src="https://img.shields.io/badge/NODE.JS-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/GROQ%20AI-FF6B35?style=for-the-badge"/>
</p>

</div>

---

# 🚀 Overview

CareerGenie is a modern AI-powered campus recruitment and placement management platform designed to bridge the gap between students, recruiters, and placement cells.

Students can discover opportunities, build stronger resumes with AI assistance, track applications, and receive personalized career guidance, while recruiters can efficiently manage hiring through an intuitive recruitment dashboard.

Deployed reliably on **Vercel (Frontend)** and **Render (Backend).**

---

# ✨ Core Features

- **AI Resume Analyzer:** Upload resumes and receive detailed AI-powered feedback with actionable improvement suggestions.

- **AI Career Copilot:** Personalized career guidance, interview preparation, and roadmap generation using LLMs.

- **Smart Job Portal:** Browse verified placement opportunities with one-click application tracking.

- **Recruiter Dashboard:** Create, update, manage, and monitor job postings and candidate applications.

- **Student Dashboard:** Centralized dashboard for resumes, applications, announcements, and placement activities.

- **Application Tracking:** Monitor every application through different recruitment stages.

- **Placement Announcements:** Receive important placement notices directly from administrators.

- **Role-Based Authentication:** Secure JWT authentication for Students, Recruiters, and Administrators.

- **Responsive UI:** Fully responsive interface optimized for desktop and mobile devices.

---

# 🤖 AI Capabilities

- Resume Review & Analysis
- Career Roadmap Generation
- Skill Gap Identification
- Resume Enhancement Suggestions
- Personalized Career Recommendations
- AI Career Assistant

---

# 🛠 Technology Stack

## Frontend

- **React.js** - Modern Component-Based UI
- **Vite** - Lightning Fast Development Environment
- **Tailwind CSS** - Utility-First Styling
- **React Router** - Client Side Routing
- **Axios** - API Communication
- **Vercel** - Production Deployment

---

## Backend

- **Node.js & Express.js** - REST API Server
- **JWT Authentication** - Secure User Authentication
- **Multer** - Resume Upload Handling
- **PDF Parser** - Resume Text Extraction
- **Render** - Backend Deployment

---

## Database & AI Services

- **MongoDB** - Primary Database
- **Mongoose** - Database ODM
- **Groq API** - LLM Integration
- **Llama Models** - AI Career Assistant

---

# 📁 Project Structure

```text
careergenie/

├── backend/                    # Express API Server
│   ├── controllers/            # Business Logic
│   ├── middleware/             # JWT & Authentication
│   ├── models/                 # MongoDB Schemas
│   ├── routes/                 # API Routes
│   ├── uploads/                # Resume Storage
│   ├── utils/                  # Helper Functions
│   ├── server.js               # Entry Point
│   └── package.json
│
├── frontend/                   # React Application
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── vite.config.js
│   └── package.json
│
├── README.md
└── .gitignore
```

---

# ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/careergenie.git

cd careergenie
```

---

### 2. Backend Setup

```bash
cd backend

npm install

# Create a .env file

PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
GROQ_API_KEY=your_api_key

npm run dev
```

---

### 3. Frontend Setup

```bash
cd ../frontend

npm install

# Create a .env file

VITE_API_BASE_URL=http://localhost:5000/api

npm run dev
```

---



# 🚀 Future Improvements

- AI Mock Interview Simulator
- Resume Builder
- Company Analytics Dashboard
- Email Notifications
- Calendar Integration
- Skill Assessment Platform
- Internship Recommendation Engine
- AI Interview Feedback
- Recruiter Analytics Dashboard
- Mobile Application

---

# 👩‍💻 Author

**Disha Mehendiratta**

Computer Science Engineering Student

Full Stack Developer • AI Enthusiast • Problem Solver

---

<div align="center">

### ⭐ If you found this project useful, consider giving it a star!

</div>
