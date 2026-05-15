import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/TeacherAuth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TeacherAuth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const endpoint = isLogin ? '/api/teacher/login' : '/api/teacher/register';
        
        try {
            const response = await axios.post(`${API_URL}${endpoint}`, formData);
            if (isLogin) {
                localStorage.setItem('teacherToken', response.data.token);
                localStorage.setItem('teacherName', response.data.name);
                navigate('/teacher-dashboard');
            } else {
                alert('Registration successful! Please login.');
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong');
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card card">
                <div className="auth-header">
                    <div className="auth-icon">
                        {isLogin ? '🔑' : '📝'}
                    </div>
                    <h2>{isLogin ? 'Teacher Login' : 'Teacher Registration'}</h2>
                    <p>{isLogin ? 'Access your dashboard to manage student enrollments.' : 'Create an account to start managing students.'}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input 
                                type="text" 
                                name="name" 
                                className="input"
                                placeholder="e.g. Prof. Arvind Kumar" 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                            type="email" 
                            name="email" 
                            className="input"
                            placeholder="name@university.edu" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            className="input"
                            placeholder="••••••••" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary auth-btn">
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
                            {isLogin ? 'Register here' : 'Login here'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TeacherAuth;
