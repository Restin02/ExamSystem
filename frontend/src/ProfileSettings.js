import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Admin.css';

const ProfileSettings = ({ token, refreshData }) => {
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [profileData, setProfileData] = useState({
        name: '',
        phone_number: '',
        grade: '',
        username: '',
        email: '',
        department: '',
        branch: '',
        password: '',
        profile_pic: '' 
    });

    const fetchProfile = useCallback(async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/profile/', {
                headers: { 'Authorization': `Token ${token}` }
            });
            
            setProfileData(prev => ({
                ...prev,
                ...res.data,
                password: '' 
            }));

            // FIX 1: Check if the path already contains http. If not, add the base URL.
            if (res.data.profile_pic) {
                const imageUrl = res.data.profile_pic.startsWith('http') 
                    ? res.data.profile_pic 
                    : `http://127.0.0.1:8000${res.data.profile_pic}`;
                setImagePreview(imageUrl);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name', profileData.name);
        formData.append('phone_number', profileData.phone_number);
        formData.append('grade', profileData.grade);
        
        if (profileData.password) {
            formData.append('password', profileData.password);
        }

        // FIX 2: Ensure the key 'profile_pic' matches exactly what your Django Serializer expects
        if (profileImage) {
            formData.append('profile_pic', profileImage); 
        }

        try {
            await axios.post('http://127.0.0.1:8000/api/update-profile/', formData, {
                headers: { 
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'multipart/form-data' 
                }
            });
            
            alert("Profile Updated Successfully!");
            setProfileData(prev => ({ ...prev, password: '' }));
            if (refreshData) refreshData(); 
        } catch (err) {
            console.error("Update Error:", err.response?.data);
            alert("Update failed: " + (JSON.stringify(err.response?.data) || "Error"));
        }
    };

    if (loading) return <div className="loader">Loading profile details...</div>;

    return (
        <div className="tab-section" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ borderBottom: '2px solid #3498db', paddingBottom: '10px', color: '#2c3e50' }}>Profile Settings</h3>
            
            <form className="admin-form" onSubmit={handleUpdate} style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                            src={imagePreview || 'https://via.placeholder.com/150'} 
                            alt="Profile" 
                            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #3498db' }} 
                            // Error handling if image fails to load
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                        />
                        <label htmlFor="file-input" style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#3498db', color: '#fff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>
                            +
                        </label>
                        <input id="file-input" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>Click + to upload new photo</p>
                </div>

                <div className="form-row" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Name</label>
                    <input 
                        type="text" 
                        placeholder="Enter your full name"
                        style={{ width: '100%', padding: '10px' }}
                        value={profileData.name || ''} 
                        onChange={e => setProfileData({...profileData, name: e.target.value})} 
                        required
                    />
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone Number</label>
                        <input 
                            type="text" 
                            style={{ width: '100%', padding: '10px' }}
                            value={profileData.phone_number || ''} 
                            onChange={e => setProfileData({...profileData, phone_number: e.target.value.replace(/\D/g, '')})} 
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Staff Grade</label>
                        <select 
                            value={profileData.grade || ''} 
                            onChange={e => setProfileData({...profileData, grade: e.target.value})}
                            style={{ width: '100%', padding: '10px' }}
                        >
                            <option value="">Select Grade</option>
                            <option value="Professor">Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Assistant Professor">Assistant Professor</option>
                        </select>
                    </div>
                </div>

                <div className="form-row" style={{ marginBottom: '25px' }}>
                    <label style={{ color: '#c0392b', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Password</label>
                    <input 
                        type="password" 
                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd' }}
                        placeholder="Leave blank to keep current password" 
                        value={profileData.password}
                        onChange={e => setProfileData({...profileData, password: e.target.value})} 
                    />
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '12px 40px', fontSize: '15px', borderRadius: '6px', cursor: 'pointer' }}>
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettings;