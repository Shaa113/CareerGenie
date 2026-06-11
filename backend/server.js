const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config();

const db = require('./utils/dbStore');

// Route imports
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const advancedRoutes = require('./routes/advanced');

const app = express();
const PORT = process.env.PORT || 5000;
const corsOptions = {
  origin: 'https://career-genie-beige.vercel.app',
  credentials: true
};

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Middleware

// Request logging middleware
app.use((req, res, next) => {
  console.log(req.method, req.originalUrl);
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`[FINISH] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use(cors({
  origin: 'https://career-genie-beige.vercel.app',
  credentials: true
}));
app.options('*', cors({
  origin: 'https://career-genie-beige.vercel.app',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/advanced', advancedRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CareerGenie API' });
});

app.get('/health', async (req, res) => {
  try {
    await db.connect();
    res.json({ ok: true, database: 'connected', mode: db.mode, uptime: process.uptime() });
  } catch (error) {
    res.status(500).json({ ok: false, database: 'disconnected', mode: db.mode });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.message && /Invalid file type|Unsupported file type|OCR/i.test(err.message)) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Seed Data helper
async function seedInitialData() {
  const users = await db.users.read();
  if (users.length === 0) {
    console.log('Seeding initial database...');

    const salt = bcrypt.genSaltSync(10);
    const hashPassword = (pass) => bcrypt.hashSync(pass, salt);

    // 1. Create Users
    await db.users.create({
      name: 'System Admin',
      email: 'admin@careergenie.com',
      password: hashPassword('admin123'),
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin'
    });

    const googleRecruiter = await db.users.create({
      name: 'Sarah Chen (Google)',
      email: 'recruiter@google.com',
      password: hashPassword('recruiter123'),
      role: 'recruiter',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sarah'
    });

    const standardStudent = await db.users.create({
      name: 'Alex Mercer',
      email: 'student@mit.edu',
      password: hashPassword('student123'),
      role: 'student',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex'
    });

    // 2. Create Student Profile
    await db.studentProfiles.create({
      userId: standardStudent.id,
      skills: ['javascript', 'react', 'node.js', 'git', 'html', 'css'],
      education: [
        { institution: 'Massachusetts Institute of Technology', degree: 'B.S.', fieldOfStudy: 'Computer Science', startYear: 2023, endYear: 2027 }
      ],
      experience: [
        { company: 'WebSolutions Inc.', position: 'Front-end Intern', description: 'Developed React dashboard, optimized load performance.' }
      ],
      certifications: ['AWS Certified Developer Associate'],
      projects: [
        { title: 'Portfolio Site', description: 'Personal portfolio built using React & Tailwind', technologies: ['react', 'tailwind'] }
      ],
      resumeUrl: 'uploads/resumes/student_alex_resume.pdf',
      resumeText: 'Alex Mercer resume seed content',
      resumeFile: {
        fileName: 'student_alex_resume.pdf',
        mimeType: 'application/pdf'
      },
      atsScore: 78,
      missingSkills: ['sql', 'docker'],
      suggestions: ['Add relational database skills like SQL.', 'Incorporate containerization details such as Docker.'],
      industryReadinessScore: 82
    });

    // 3. Create Jobs (Approved)
    const job1 = await db.jobs.create({
      title: 'Frontend Developer React',
      company: 'Google',
      recruiterId: googleRecruiter.id,
      description: 'Join the Google Workspace team building next-generation responsive user interfaces. You will work extensively with React.js, Tailwind CSS, TypeScript, and state management frameworks.',
      requirements: ['javascript', 'react', 'typescript', 'tailwind', 'git'],
      location: 'Mountain View, CA',
      type: 'Full-time',
      salary: '$120,000 - $140,000',
      status: 'Approved'
    });

    const job2 = await db.jobs.create({
      title: 'Full Stack Node/React Intern',
      company: 'OpenSource Labs',
      recruiterId: googleRecruiter.id,
      description: 'Looking for a passionate full-stack developer intern. You will work with Node.js, Express, React, and MongoDB.',
      requirements: ['javascript', 'react', 'node.js', 'express', 'mongodb', 'git'],
      location: 'Remote',
      type: 'Internship',
      salary: '$30 - $40 / hour',
      status: 'Approved'
    });

    // 4. Create Jobs (Pending Moderation)
    await db.jobs.create({
      title: 'AI Engineering Specialist',
      company: 'FutureTech AI',
      recruiterId: googleRecruiter.id,
      description: 'Lead AI developer role, designing customized LLM agents and integration pipelines.',
      requirements: ['python', 'machine learning', 'deep learning', 'nlp', 'pytorch'],
      location: 'San Francisco, CA',
      type: 'Full-time',
      salary: '$180,000 - $220,000',
      status: 'Pending'
    });

    // 5. Create Applications
    await db.applications.create({
      jobId: job1.id,
      studentId: standardStudent.id,
      resumeUrl: 'uploads/resumes/student_alex_resume.pdf',
      matchScore: 80,
      missingSkills: ['typescript'],
      status: 'Shortlisted'
    });

    await db.applications.create({
      jobId: job2.id,
      studentId: standardStudent.id,
      resumeUrl: 'uploads/resumes/student_alex_resume.pdf',
      matchScore: 100,
      missingSkills: [],
      status: 'Applied'
    });

    // 6. Create Notifications
    await db.notifications.create({
      recipient: standardStudent.id,
      title: 'Application Shortlisted!',
      message: 'Congratulations! Your application for Frontend Developer React at Google has been shortlisted.'
    });

    // 7. Create Complaints
    await db.complaints.create({
      userId: googleRecruiter.id,
      title: 'Spam Applicants Detected',
      description: 'Several students are submitting resumes that do not contain actual project PDFs. Requesting moderation check.',
      status: 'Open'
    });

    console.log('Seeding completed successfully!');
  }
}

async function startServer() {
  try {
    await db.connect();
    await db.ensureIndexes();
    if (db.mode === 'mongo') {
      console.log('Database Connected');
    } else {
      console.warn('Database Failed: MongoDB unavailable, using file-backed storage');
    }
    await seedInitialData();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Server Failed: Port ${PORT} is already in use.`);
      } else {
        console.error(`Server Failed: ${error.message}`);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error(`Startup Failed: ${error.message}`);
    process.exit(1);
  }
}

startServer();
