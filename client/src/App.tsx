import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import StudentForm from './components/StudentForm';
import TeacherDashboard from './components/TeacherDashboard';
import TeacherAuth from './components/TeacherAuth';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content">
            <Link to="/" className="nav-logo">
              <span className="logo-icon">S</span>
              SWAYAM <span className="logo-accent">Portal</span>
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Student Portal</Link>
              <Link to="/teacher-login" className="nav-link teacher-btn">Teacher Login</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<StudentForm />} />
            <Route path="/teacher-login" element={<TeacherAuth />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} SWAYAM Student Management System. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
