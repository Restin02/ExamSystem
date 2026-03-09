import React, { useState } from 'react';

const DeptSettings = ({ departments, setDepartments }) => {
    const [newDeptName, setNewDeptName] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchSemCount, setNewBranchSemCount] = useState(8);
    const [selectedDeptForBranch, setSelectedDeptForBranch] = useState('');

    const handleAddDept = () => {
        if (!newDeptName.trim()) return;
        // Check if department already exists to prevent duplicates
        if (departments.some(d => d.name === newDeptName)) {
            alert("Department already exists");
            return;
        }
        setDepartments([...departments, { name: newDeptName, branches: [] }]);
        setNewDeptName('');
    };

    const handleRemoveDept = (deptName) => {
        setDepartments(departments.filter(d => d.name !== deptName));
    };

    const handleAddBranch = () => {
        if (!selectedDeptForBranch || !newBranchName.trim()) return;
        
        const updated = departments.map(d => {
            if (d.name === selectedDeptForBranch) {
                // Prevent duplicate branches in the same department
                if (d.branches.some(b => b.name === newBranchName)) {
                    alert("Branch already exists in this department");
                    return d;
                }
                return { 
                    ...d, 
                    branches: [...d.branches, { name: newBranchName, semCount: parseInt(newBranchSemCount) }] 
                };
            }
            return d;
        });
        setDepartments(updated);
        setNewBranchName('');
        setNewBranchSemCount(8);
    };

    const handleRemoveBranch = (deptName, branchName) => {
        const updated = departments.map(d => {
            if (d.name === deptName) {
                return { ...d, branches: d.branches.filter(b => b.name !== branchName) };
            }
            return d;
        });
        setDepartments(updated);
    };

    return (
        <div className="tab-section">
            <h3>Structure Management</h3>
            
            {/* Form to Add Department */}
            <div className="admin-form" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee' }}>
                <h4>Add New Department</h4>
                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="Department Name (e.g., Engineering)" 
                        value={newDeptName} 
                        onChange={e => setNewDeptName(e.target.value)} 
                    />
                    <button type="button" className="btn-primary" onClick={handleAddDept}>Add Dept</button>
                </div>
            </div>

            {/* Form to Add Branch to a Department */}
            <div className="admin-form" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee' }}>
                <h4>Add New Branch</h4>
                <div className="form-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <select 
                        value={selectedDeptForBranch} 
                        onChange={e => setSelectedDeptForBranch(e.target.value)}
                    >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                    <input 
                        type="text" 
                        placeholder="Branch Name" 
                        value={newBranchName} 
                        onChange={e => setNewBranchName(e.target.value)} 
                    />
                    <input 
                        type="number" 
                        placeholder="Sems" 
                        style={{ width: '60px' }}
                        value={newBranchSemCount} 
                        onChange={e => setNewBranchSemCount(e.target.value)} 
                    />
                    <button type="button" className="btn-primary" onClick={handleAddBranch}>Add Branch</button>
                </div>
            </div>

            <hr style={{ margin: '20px 0' }} />

            {/* Existing Structure View */}
            <div className="tab-section">
                <h4>Existing Structure</h4>
                <div className="dept-list">
                    {departments.length === 0 && <p>No departments added yet.</p>}
                    {departments.map(dept => (
                        <div key={dept.name} className="dept-card" style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <strong style={{ fontSize: '1.1rem', color: '#2c3e50' }}>{dept.name}</strong>
                                <button 
                                    className="btn-secondary" 
                                    style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} 
                                    onClick={() => handleRemoveDept(dept.name)}
                                >
                                    Delete Dept
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {dept.branches.map(branch => (
                                    <span key={branch.name} style={{ background: '#f0f4f8', padding: '5px 10px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {branch.name} ({branch.semCount} Sems)
                                        <button 
                                            style={{ border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold' }} 
                                            onClick={() => handleRemoveBranch(dept.name, branch.name)}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DeptSettings;