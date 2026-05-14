import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentForm from './components/StudentForm';
import TeacherDashboard from './components/TeacherDashboard';
import TeacherAuth from './components/TeacherAuth';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
           <div className="nav-logo">SWAYAM Enrollment Portal</div>
        </header>

        <main className="content">
          <Routes>
            {/* Student Page */}
            <Route path="/" element={<StudentForm />} />
            
            {/* Teacher Pages */}
            <Route path="/teacher-login" element={<TeacherAuth />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
