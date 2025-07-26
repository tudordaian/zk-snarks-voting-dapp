import React, { useState } from 'react';
import { useAuth } from '../identity/AuthContext';
import { ipfsService } from './services/ipfsService';
import { contractService } from '../blockchain/services/contractService';

interface SubmitProposalModalProps {
    electionId: number;
    electionName: string;
    onClose: () => void;
    onSubmitSuccess: () => void;
}

const SubmitProposalModal: React.FC<SubmitProposalModalProps> = ({ 
    electionId, 
    electionName, 
    onClose, 
    onSubmitSuccess 
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { account } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!name.trim()) {
            setError('Proposal name is required');
            return;
        }

        if (!description.trim()) {
            setError('Proposal description is required');
            return;
        }

        if (!account) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        setMessage('Uploading proposal data to IPFS...');

        try {
            const data = {
                name: name.trim(),
                description: description.trim(),
                proposerAddress: account
            };
            const dataCID = await ipfsService.uploadData(data);

            let imageCID = '';
            if (imageFile) {            
                setMessage('Uploading image to IPFS...');
                imageCID = await ipfsService.uploadImage(imageFile);
            }

            setMessage('Submitting proposal...');
            
            const result = await contractService.submitProposal(electionId, dataCID, imageCID);
            
            if (result) {
                setMessage(`Proposal submitted successfully! Transaction: ${result.hash}`);
                
                setTimeout(() => {
                    onSubmitSuccess();
                    onClose();
                }, 2000);
            } else {
                throw new Error('Failed to submit proposal - no transaction returned');
            }

        } catch (err: any) {
            console.error('Submit proposal error:', err);
            let errorMessage = err.message || 'Failed to submit proposal';
            
            // ipfs
            if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
                errorMessage = 'Network timeout while uploading to IPFS.';
            } else if (errorMessage.includes('fetch failed')) {
                errorMessage = 'Network error occurred.';
            } else if (errorMessage.includes('abort')) {
                errorMessage = 'Upload was cancelled due to timeout.';
            }
            
            // contract
            else if (err.name === 'ProposalError') {
                errorMessage = err.message;
            } else if (err.name === 'UserRejectionError') {
                errorMessage = 'Transaction was rejected by user.';
            } else if (err.name === 'NonceError') {
                errorMessage = 'Transaction conflict. Please try again.';
            } else if (err.name === 'OwnerError') {
                errorMessage = 'Only the contract owner can perform this action.';
            } else if (err.name === 'ContractError') {
                errorMessage = `Contract error: ${err.message}`;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('Image file must be less than 10MB');
                return;
            }
            setImageFile(file);
            setError('');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <h2 className="modal-title">
                    Submit Proposal to "{electionName}"
                </h2>

                {message && (
                    <div className="modal-message success">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="modal-message error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-form-group">
                        <label className="modal-form-label">
                            Proposal Name *
                        </label>
                        <input
                            type="text"
                            className="modal-form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter proposal name..."
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="modal-form-group">
                        <label className="modal-form-label">
                            Description *
                        </label>
                        <textarea
                            className="modal-form-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter proposal description..."
                            rows={4}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="modal-form-group">
                        <label className="modal-form-label">
                            Image (Optional)
                        </label>
                        <input
                            type="file"
                            className="modal-form-input"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={isLoading}
                        />
                        {imageFile && (
                            <p className="modal-file-selected">
                                Selected: {imageFile.name}
                            </p>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="modal-button cancel"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="modal-button submit"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Submitting...' : 'Submit Proposal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitProposalModal;
