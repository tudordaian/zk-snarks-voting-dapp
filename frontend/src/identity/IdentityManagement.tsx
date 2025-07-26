import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '../election/services/apiService';

const IdentityManagement: React.FC = () => {
    const { cnp, semaphoreIdentity, identityPrivateKey, isLoading, registrationTxHash, setRegistrationTxHash } = useAuth();
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isRegistered, setIsRegistered] = useState<boolean>(false);
    const [copiedField, setCopiedField] = useState<string>('');

    useEffect(() => {
        const checkRegistration = async () => {
            if (!cnp || !semaphoreIdentity) {
                setIsRegistered(false);
                return;
            }
            
            try {
                const response = await apiService.getIdentityCommitmentByCnp(cnp);
                const registered = response.success && 
                                 response.data?.identityCommitment === semaphoreIdentity.commitment.toString();
                setIsRegistered(registered);
            } catch {
                setIsRegistered(false);
            }
        };
        checkRegistration();
    }, [cnp, semaphoreIdentity]);

    const handleCopyToClipboard = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(''), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleRegisterIdentity = async () => {
        if (!semaphoreIdentity) {
            setError("No Semaphore identity available to register.");
            return;
        }
        if (!cnp) {
            setError("CNP is required to register an identity.");
            return;
        }
        
        setError('');
        setStatus('Registering identity...');
        
        try {
            const payload = {
                cnp, 
                identityCommitment: semaphoreIdentity.commitment.toString()
            };
            
            const response = await apiService.registerIdentity(payload);
            setStatus(`Identity registered successfully: ${response.message}`);
            setIsRegistered(true);
            
            if (response.data?.transactionHash) {
                setRegistrationTxHash(response.data.transactionHash);
            }
        } catch (e: any) {
            console.error("Error registering identity:", e);
            const errorMessage = e.status === 409 ? `Registration conflict: ${e.message}` :
                               e.status === 400 ? `Registration error: ${e.message}` :
                               e.message || "Unknown error.";
            setError(errorMessage);
            setStatus('');
        }
    };

    const isRegistering = status.startsWith('Registering');
    const currentUser = cnp ? `${cnp}` : 'N/A';

    if (isLoading) {
        return <p>Loading identity information...</p>;
    }

    if (!cnp) {
        return (
            <div className="identity-management-container">
                <p>Log in with your CNP to manage your Semaphore identity.</p>
            </div>
        );
    }

    return (
        <div className="identity-management-container">
            <h3 className="identity-management-title" style={{marginTop: 20}}>Identity Management</h3>
            {!semaphoreIdentity ? (
                <div className="identity-action-section">
                    <p>Your Semaphore identity is being generated automatically...</p>
                    <p>Current user: {currentUser}</p>
                </div>
            ) : (
                <div className="identity-display-section">
                    <h4>Your Semaphore Identity:</h4>
                    {error && <p className="error-message">{error}</p>}
                    <p className="info-text">
                        <strong>CNP:</strong> {currentUser}
                        <button 
                            className={`copy-button ${copiedField === 'cnp' ? 'copied' : ''}`}
                            onClick={() => handleCopyToClipboard(currentUser, 'cnp')}
                        >
                            Copy
                        </button>
                    </p>
                    
                    <p className="info-text">
                        <strong>Identity Commitment (public):</strong> {semaphoreIdentity.commitment}
                        <button 
                            className={`copy-button ${copiedField === 'commitment' ? 'copied' : ''}`}
                            onClick={() => handleCopyToClipboard(semaphoreIdentity.commitment.toString(), 'commitment')}
                        >
                            Copy
                        </button>
                    </p>
                    
                    <p className="info-text">
                        <strong>Identity Public Key:</strong> {semaphoreIdentity.publicKey}
                        <button 
                            className={`copy-button ${copiedField === 'publicKey' ? 'copied' : ''}`}
                            onClick={() => handleCopyToClipboard(semaphoreIdentity.publicKey.toString(), 'publicKey')}
                        >
                            Copy
                        </button>
                    </p>
                    
                    <p className="info-text">
                        <strong>Identity Private Key:</strong> {identityPrivateKey}
                        <button 
                            className={`copy-button ${copiedField === 'privateKey' ? 'copied' : ''}`}
                            onClick={() => handleCopyToClipboard(identityPrivateKey || '', 'privateKey')}
                        >
                            Copy
                        </button>
                    </p>
                    
                    <p className="info-text">
                        <strong>Secret Scalar:</strong> {semaphoreIdentity.secretScalar}
                        <button 
                            className={`copy-button ${copiedField === 'secretScalar' ? 'copied' : ''}`}
                            onClick={() => handleCopyToClipboard(semaphoreIdentity.secretScalar.toString(), 'secretScalar')}
                        >
                            Copy
                        </button>
                    </p>
                    
                    <div>
                        {isRegistered ? (
                            <div>
                                {registrationTxHash && (
                                    <p className="info-text">
                                        <strong>Registration Tx Hash:</strong> {registrationTxHash}
                                        <button 
                                            className={`copy-button ${copiedField === 'txHash' ? 'copied' : ''}`}
                                            onClick={() => handleCopyToClipboard(registrationTxHash, 'txHash')}
                                        >
                                            Copy
                                        </button>
                                    </p>
                                )}
                                <p className='identity-message-green'>
                                    Identity is registered ✅
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className='identity-message-orange'>
                                    Identity not registered yet. Register to participate in voting ⚠️
                                </p>
                                <button 
                                    onClick={handleRegisterIdentity} 
                                    disabled={isRegistering} 
                                    className="action-button"
                                    style={{ marginTop: '10px' }}
                                >
                                    {isRegistering ? 'Registering...' : 'Register Identity'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdentityManagement;