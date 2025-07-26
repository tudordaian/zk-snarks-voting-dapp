import React from 'react';
import { useAuth } from '../../../identity/AuthContext';
import CreateElectionForm from './CreateElectionForm';
import { Navigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const { isOwner, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading-message">Loading admin status...</div>;
    }

    if (!isOwner) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="admin-dashboard-container">
            <h2 className="admin-dashboard-title">Admin Dashboard</h2>
            <CreateElectionForm />
        </div>
    );
};

export default AdminDashboard;