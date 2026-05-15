import React, { useState } from 'react';
import axios from 'axios';
import '../styles/StudentForm.css';
import heroImg from '../assets/hero.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StudentForm: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        rollNo: '',
        course: 'MCA',
        enrolled: 'No'
    });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const data = new FormData();
        data.append('name', formData.name);
        data.append('rollNo', formData.rollNo);
        data.append('course', formData.course);
        data.append('enrolled', formData.enrolled);
        if (file) {
            data.append('screenshot', file);
        }

        try {
            await axios.post(`${API_URL}/api/submit`, data);
            setMessage('Success! Your details have been submitted.');
            setFormData({ name: '', rollNo: '', course: 'MCA', enrolled: 'No' });
            setFile(null);
        } catch (error) {
            console.error('Error submitting form:', error);
            setMessage('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="student-portal">
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Register for <span className="text-primary">SWAYAM</span> Courses</h1>
                    <p>Elevate your skills with government-recognized certifications. Complete your enrollment details below to get started.</p>
                </div>
                <div className="hero-image">
                    <img src={heroImg} alt="Student Illustration" />
                </div>
            </section>

            <div className="form-wrapper">
                <div className="form-card card">
                    <div className="form-header">
                        <h2>Enrollment Details</h2>
                        <p>Please fill in all the required information accurately.</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="student-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    className="input"
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="e.g. Rahul Sharma" 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Roll Number</label>
                                <input 
                                    type="text" 
                                    name="rollNo" 
                                    className="input"
                                    value={formData.rollNo} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="e.g. 21MCA001" 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Course</label>
                                <select name="course" className="input" value={formData.course} onChange={handleChange}>
                                    <option value="MCA">MCA</option>
                                    <option value="MSC COMPUTER SCIENCE">MSC COMPUTER SCIENCE</option>
                                    <option value="MSC (DSML)">MSC (DSML)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">SWAYAM Enrollment Status</label>
                                <select name="enrolled" className="input" value={formData.enrolled} onChange={handleChange}>
                                    <option value="Yes">Yes, Enrolled</option>
                                    <option value="No">No, Not Yet</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Proof of Enrollment (Screenshot)</label>
                            <div className="file-upload-wrapper">
                                <input 
                                    type="file" 
                                    id="screenshot"
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    required={formData.enrolled === 'Yes'} 
                                    className="file-input"
                                />
                                <label htmlFor="screenshot" className="file-label">
                                    <span className="file-btn">Choose File</span>
                                    <span className="file-name">{file ? file.name : 'No file chosen'}</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Enrollment Details'}
                        </button>
                        
                        {message && (
                            <div className={`form-message ${message.includes('Success') ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentForm;
