import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Login: React.FC = () => {
    const { account, cnp, isLoading, isOwner, connectWallet, loginWithCnp, logout } = useAuth();
    const [cnpInput, setCnpInput] = useState<string>('');

    const handleLogin = async () => {
        if (!account) {
            await connectWallet();
        }
    };

    const handleCnpSubmit = async () => {
        if (!cnpInput.trim()) {
            alert("Please enter your CNP.");
            return;
        }
        await loginWithCnp(cnpInput.trim());
    };

    if (isLoading) {
        return <div className="loading-message">Loading...</div>;
    }

    return (
        <div className="login-container">
            <h2 className="login-title">Login Status</h2>
            {!account ? (
                <div className="login-section">
                    <button 
                        className="action-button primary" 
                        onClick={handleLogin} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Connecting...' : 'Connect MetaMask wallet'}
                    </button>
                </div>
            ) : (
                <div className="login-section">
                    {isOwner && (
                        <div className="admin-badge">
                            Admin access granted (Contract Owner) ✅
                        </div>
                    )}
                    <div className="wallet-info">
                        <strong>Wallet connected:</strong> {account}
                    </div>
                    

                    {!cnp && (
                        <div className="cnp-input-section">
                            <p>Provide your CNP:</p>
                            <div>
                                <input
                                    type="text"
                                    className="cnp-input"
                                    value={cnpInput}
                                    onChange={(e) => setCnpInput(e.target.value)}
                                    placeholder="Enter your CNP"
                                />
                                <button 
                                    className="action-button primary" 
                                    onClick={handleCnpSubmit}
                                >
                                    Submit CNP
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {cnp && (
                        <div className="wallet-info">
                            <strong>Logged in with CNP:</strong> {cnp}
                        </div>
                    )}
                    
                    <button 
                        className="action-button danger" 
                        onClick={logout}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;