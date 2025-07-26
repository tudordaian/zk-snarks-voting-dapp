import './_css/style';
import React from 'react';
import { NavLink, Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './identity/AuthContext';
import { ElectionList, Election } from './election';
import Login from './identity/Login';
import IdentityManagement from './identity/IdentityManagement';
import AdminDashboard from './election/components/admin/AdminDashboard';
import Blockchain from './blockchain/Blockchain';

const AppContent: React.FC = () => {
    const { isLoading: authLoading, isOwner } = useAuth();

    if (authLoading) {
        return <p>Loading authentication status...</p>;
    }

    return (
        <Router>
            <div className="app-container">
                <nav className="navigation">
                    <div className="nav-logo">
                        <img src="/public/roaep.png" alt="roaep" className="logo-image" />
                    </div>
                    <div className="nav-links">
                        <NavLink to="/" className="nav-link">Elections</NavLink>
                        <NavLink to="/login" className="nav-link">Login</NavLink>
                        <NavLink to="/identity" className="nav-link">Identity</NavLink>
                        {isOwner && (
                            <NavLink to="/admin" className="nav-link admin-link">
                                Admin Dashboard
                            </NavLink>
                        )}
                    </div>
                </nav>

                <div className="panels-container">
                    <div className="left-panel">
                        <div className="left-content">
                            <Routes>
                                <Route path="/" element={<ElectionList />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/identity" element={<IdentityManagement />} />
                                <Route path="/elections/:id" element={<Election />} />
                                <Route path="/admin"
                                       element={isOwner ? <AdminDashboard /> : <Navigate to="/" replace />}
                                />
                            </Routes>
                        </div>
                    </div>
                    
                    <div className="right-panel">
                        <Blockchain />
                    </div>
                </div>
            </div>
        </Router>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent/>
        </AuthProvider>
    );
}

export default App;