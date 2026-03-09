import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Admin.css';

// Import Sub-components
import StaffManagement from './components/StaffManagement';
import StaffDetailsView from './components/StaffDetailsView';
import StaffTimetable from './components/StaffTimetable';
import ClassroomSetup from './components/ClassroomSetup';
import ExamSchedule from './components/ExamSchedule';
import DeptSettings from './components/DeptSettings';

const AdminHome = () => {
    const [activeTab, setActiveTab] = useState('staff');
    const [staffList, setStaffList] = useState([]);
    const [roomList, setRoomList] = useState([]);
    const [departments, setDepartments] = useState([
        { 
            name: 'B.Tech', 
            branches: [
                { name: 'Computer Engineering', semCount: 8 },
                { name: 'Mechanical Engineering', semCount: 8 },
                { name: 'Electronics & Communication', semCount: 8 }
            ] 
        },
        { 
            name: 'MCA', 
            branches: [
                { name: 'MCA', semCount: 4 },
                { name: 'IMCA', semCount: 10 }
            ] 
        }
    ]);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const staffRes = await axios.get('http://127.0.0.1:8000/api/admin/get-all-staff/', {
                headers: { 'Authorization': `Token ${token}` }
            });
            setStaffList(staffRes.data);
            const roomRes = await axios.get('http://127.0.0.1:8000/api/admin/get-rooms/', {
                headers: { 'Authorization': `Token ${token}` }
            });
            setRoomList(roomRes.data); 
        } catch (err) {
            console.error("Error fetching data", err);
        }
    }, [token]);

    useEffect(() => {
        const isSuper = localStorage.getItem('is_superuser');   
        if (isSuper !== 'true') {
            alert("Unauthorized access!");
            window.location.href = '/login';
            return;
        }
        fetchData();
    }, [fetchData]);

    // --- LOGOUT HANDLER ---
    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            localStorage.clear();
            window.location.href = '/login';
        }
    };

    // Common Helpers shared by components
    const renderBranchOptions = (deptName) => {
        const dept = departments.find(d => d.name === deptName);
        if (!dept) return <option value="">Select Dept First</option>;
        return (
            <>
                <option value="">Select Branch</option>
                {dept.branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </>
        );
    };

    const renderSemesterOptions = (deptName, branchName) => {
        const dept = departments.find(d => d.name === deptName);
        const branch = dept?.branches.find(b => b.name === branchName);
        if (!branch) return <option value="">Select Branch First</option>;
        const sems = [];
        for (let i = 1; i <= branch.semCount; i++) sems.push(`S${i}`);
        return sems.map(s => <option key={s} value={s}>{s}</option>);
    };

    return (
        <div className="admin-dashboard">
            <nav className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    <h2>Admin Portal</h2>
                    <button className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Staff Management</button>
                    <button className={activeTab === 'view-details' ? 'active' : ''} onClick={() => setActiveTab('view-details')}>Staff Details View</button>
                    <button className={activeTab === 'timetable' ? 'active' : ''} onClick={() => setActiveTab('timetable')}>Staff Timetable</button>
                    <button className={activeTab === 'room' ? 'active' : ''} onClick={() => setActiveTab('room')}>Classroom Setup</button>
                    <button className={activeTab === 'exam' ? 'active' : ''} onClick={() => setActiveTab('exam')}>Exam Schedule</button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Dept Settings</button>
                </div>

                {/* --- LOGOUT BUTTON AT BOTTOM --- */}
                <div style={{ padding: '20px', borderTop: '1px solid #444' }}>
                    <button 
                        onClick={handleLogout} 
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            background: '#ff4d4d', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="admin-main-content">
                {activeTab === 'staff' && <StaffManagement staffList={staffList} departments={departments} token={token} fetchData={fetchData} renderBranchOptions={renderBranchOptions} />}
                {activeTab === 'view-details' && <StaffDetailsView staffList={staffList} token={token} />}
                {activeTab === 'timetable' && <StaffTimetable staffList={staffList} departments={departments} token={token} />}
                {activeTab === 'room' && <ClassroomSetup roomList={roomList} token={token} fetchData={fetchData} />}
                {activeTab === 'exam' && <ExamSchedule departments={departments} token={token} renderBranchOptions={renderBranchOptions} renderSemesterOptions={renderSemesterOptions} />}
                {activeTab === 'settings' && <DeptSettings departments={departments} setDepartments={setDepartments} />}
            </div>
        </div>
    );
};

export default AdminHome;