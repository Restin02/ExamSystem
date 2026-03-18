import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './StaffHome.css';

const ProfileSettings = ({ token, refreshData, initialData }) => {
    const [loading, setLoading] = useState(!initialData);
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
    });

    const BASE_URL = 'http://127.0.0.1:8000';

    const formatImageUrl = (url) => {
        if (!url) return 'https://via.placeholder.com/150';
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
        return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
    };

    const fetchProfile = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/profile/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            
            setProfileData(prev => ({
                ...prev,
                ...res.data,
                password: '' 
            }));

            const pic = res.data.profile_pic || res.data.image_url;
            if (pic) setImagePreview(formatImageUrl(pic));
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (initialData) {
            setProfileData(prev => ({ ...prev, ...initialData, password: '' }));
            const pic = initialData.profile_pic || initialData.image_url || initialData.image;
            setImagePreview(formatImageUrl(pic));
            setLoading(false);
        } else {
            fetchProfile();
        }
    }, [initialData, fetchProfile]);

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
        formData.append('name', profileData.name || '');
        formData.append('phone_number', profileData.phone_number || '');
        formData.append('grade', profileData.grade || '');
        
        if (profileData.password) formData.append('password', profileData.password);
        if (profileImage) formData.append('profile_pic', profileImage); 

        try {
            setLoading(true);
            await axios.post(`${BASE_URL}/api/update-profile/`, formData, {
                headers: { 
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'multipart/form-data' 
                }
            });
            
            alert("Profile Updated Successfully!");
            setProfileData(prev => ({ ...prev, password: '' }));
            if (refreshData) await refreshData(); 
        } catch (err) {
            alert("Update failed: " + (err.response?.data?.detail || "Check server"));
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loader">Updating Profile...</div>;

    return (
        <div className="timetable-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card-header">
                <h3>Account Settings</h3>
            </div>
            
            <form onSubmit={handleUpdate} className="settings-form">
                {/* Profile Picture Upload Section */}
                <div className="profile-image-wrapper" style={{ marginBottom: '30px' }}>
                    <div className="image-container" style={{ position: 'relative' }}>
                        <img 
                            src={imagePreview} 
                            alt="Profile" 
                            className="profile-img"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                        />
                        <label htmlFor="file-input" className="upload-button-outside" style={{ position: 'absolute', bottom: '0', right: '0' }}>
                            ✎
                        </label>
                        <input id="file-input" type="file" accept="image/*" onChange={handleImageChange} hidden />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click the icon to change photo</p>
                </div>

                {/* Form Fields using StaffHome.css logic */}
                <div className="meta-grid-horizontal" style={{ background: 'transparent', padding: '0', color: 'var(--text-main)' }}>
                    <div className="form-group">
                        <label><strong>Full Name</strong></label>
                        <input 
                            type="text" 
                            className="staff-view-table" // Reusing table-style input borders
                            style={{ width: '100%', textAlign: 'left', borderRadius: '8px', border: '1px solid #ddd', marginTop: '5px' }}
                            value={profileData.name || ''} 
                            onChange={e => setProfileData({...profileData, name: e.target.value})} 
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><strong>Phone Number</strong></label>
                        <input 
                            type="text" 
                            className="staff-view-table"
                            style={{ width: '100%', textAlign: 'left', borderRadius: '8px', border: '1px solid #ddd', marginTop: '5px' }}
                            value={profileData.phone_number || ''} 
                            onChange={e => setProfileData({...profileData, phone_number: e.target.value.replace(/\D/g, '')})} 
                        />
                    </div>

                    <div className="form-group">
                        <label><strong>Staff Grade</strong></label>
                        <select 
                            className="staff-view-table"
                            style={{ width: '100%', textAlign: 'left', borderRadius: '8px', border: '1px solid #ddd', marginTop: '5px', height: '48px' }}
                            value={profileData.grade || ''} 
                            onChange={e => setProfileData({...profileData, grade: e.target.value})}
                        >
                            <option value="">Select Grade</option>
                            <option value="Professor">Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Assistant Professor">Assistant Professor</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label><strong style={{ color: 'var(--danger)' }}>New Password</strong></label>
                        <input 
                            type="password" 
                            className="staff-view-table"
                            style={{ width: '100%', textAlign: 'left', borderRadius: '8px', border: '1px solid #ddd', marginTop: '5px' }}
                            placeholder="Optional" 
                            value={profileData.password || ''}
                            onChange={e => setProfileData({...profileData, password: e.target.value})} 
                        />
                    </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <button type="submit" className="menu-trigger" style={{ padding: '12px 40px' }}>
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettings;