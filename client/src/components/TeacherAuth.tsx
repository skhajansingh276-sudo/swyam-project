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
        <div className="auth-container">
            <div className="auth-box">
                <h2>{isLogin ? 'Teacher Login' : 'Teacher Registration'}</h2>
                {error && <p className="error-msg">{error}</p>}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <input type="text" name="name" placeholder="Full Name" onChange={handleChange} required />
                    )}
                    <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required />
                    <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
                    <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
                </form>
                <p onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
                    {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
                </p>
            </div>
        </div>
    );
};

export default TeacherAuth;
