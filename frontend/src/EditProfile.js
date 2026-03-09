const EditProfile = () => {
    const [profileData, setProfileData] = useState({ name: '', email: '', password: '' });

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://127.0.0.1:8000/api/user/update-profile/', profileData, {
                headers: { Authorization: `Token ${token}` }
            });
            alert("Profile Updated Successfully!");
        } catch (err) {
            alert("Update failed");
        }
    };

    return (
        <div className="profile-container">
            <h2>My Profile</h2>
            <form onSubmit={handleUpdate} className="admin-form">
                <div>
                    <label>Update Name</label>
                    <input type="text" onChange={e => setProfileData({...profileData, name: e.target.value})} />
                </div>
                <div>
                    <label>Change Password</label>
                    <input type="password" placeholder="Enter new password" onChange={e => setProfileData({...profileData, password: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary">Save Changes</button>
            </form>
        </div>
    );
};