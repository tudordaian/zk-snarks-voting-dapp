import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../identity/AuthContext';
import { contractService } from '../../../blockchain/services/contractService';
import { ipfsService } from '../../services/ipfsService';
import { UpdateElectionModalProps, ProposalFormData } from '../../types';
import '../../../_css/update-election.css';

const FormField = ({ id, label, type = "text", value, onChange, required = true }: {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) => (
    <div className="update-election-form-field">
        <label htmlFor={id} className="update-election-form-label">{label}:</label><br />
        <input 
            type={type}
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            required={required}
            className="update-election-form-input"
        />
    </div>
);

const Button = ({ type = "button", onClick, disabled, className, children }: {
    type?: "button" | "submit";
    onClick?: () => void;
    disabled?: boolean;
    className: string;
    children: React.ReactNode;
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`update-election-btn ${className}`}
    >
        {children}
    </button>
);

const UpdateElectionModal: React.FC<UpdateElectionModalProps> = ({ 
    electionId, 
    currentElection, 
    onClose,
    onSuccess
}) => {
    const [name, setName] = useState('');
    const [cityArea, setCityArea] = useState('');
    const [proposals, setProposals] = useState<ProposalFormData[]>([{ name: '', description: '' }]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFormInitialized, setIsFormInitialized] = useState(false);
    const [originalProposalData, setOriginalProposalData] = useState<Map<number, {name: string, description: string}>>(new Map());
    const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);

    const { isOwner, account } = useAuth();

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isLoading) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [onClose, isLoading]);

    const addProposal = () => {
        setProposals([...proposals, { name: '', description: '' }]);
    };

    const removeProposal = (index: number) => {
        if (proposals.length > 1) {
            setProposals(proposals.filter((_, i) => i !== index));
        }
    };

    const updateProposal = (index: number, field: keyof ProposalFormData, value: string | File | undefined) => {
        const updatedProposals = proposals.map((proposal, i) => 
            i === index ? { ...proposal, [field]: value } : proposal
        );
        setProposals(updatedProposals);
    };

    useEffect(() => {
        const loadExistingData = async () => {
            if (!isFormInitialized && currentElection) {
                setIsLoadingExistingData(true);
                setName(currentElection.name);
                setCityArea(currentElection.cityArea);
                
                const loadedProposals: ProposalFormData[] = [];
                const originalData = new Map<number, {name: string, description: string}>();
                
                for (let i = 0; i < currentElection.proposals.length; i++) {
                    const proposal = currentElection.proposals[i];
                    let proposalData: ProposalFormData = {
                        name: `Proposal ${i + 1}`, 
                        description: '',
                        imageFile: undefined
                    };
                    
                    if (proposal.dataCID && proposal.dataCID.trim() !== '') {
                        try {
                            const timeoutPromise = new Promise<never>((_, reject) =>
                                setTimeout(() => reject(new Error('IPFS request timed out')), 8000)
                            );
                            
                            const dataPromise = ipfsService.getData(proposal.dataCID);
                            const data = await Promise.race([dataPromise, timeoutPromise]);
                            
                            proposalData = {
                                name: data.name || `Proposal ${i + 1}`,
                                description: data.description || 'No description available',
                                imageFile: undefined 
                            };
                            
                            originalData.set(i, {
                                name: data.name || `Proposal ${i + 1}`,
                                description: data.description || 'No description available'
                            });
                        } catch (error: any) {
                            console.warn(`Failed to fetch metadata for proposal ${i + 1}:`, error);
                            
                            const isNetworkError = error.message?.includes('timeout') || 
                                                 error.message?.includes('fetch failed') ||
                                                 error.message?.includes('ETIMEDOUT');
                            
                            const fallbackName = isNetworkError 
                                ? `Proposal ${i + 1} (Network Error)`
                                : `Proposal ${i + 1}`;
                            
                            proposalData = {
                                name: fallbackName,
                                description: isNetworkError 
                                    ? 'Unable to load description due to network issues.'
                                    : 'No description available',
                                imageFile: undefined
                            };
                            
                            originalData.set(i, {
                                name: fallbackName,
                                description: isNetworkError 
                                    ? 'Unable to load description due to network issues.'
                                    : 'No description available'
                            });
                        }
                    } else {
                        originalData.set(i, {
                            name: `Proposal ${i + 1}`,
                            description: 'No description available'
                        });
                    }
                    
                    loadedProposals.push(proposalData);
                }
                
                setOriginalProposalData(originalData);
                setProposals(loadedProposals);
                
                const startDate = new Date(currentElection.startTime * 1000);
                const endDate = new Date(currentElection.endTime * 1000);
                
                setStartTime(startDate.toISOString().slice(0, 16)); 
                setEndTime(endDate.toISOString().slice(0, 16));
                setIsLoadingExistingData(false);
                setIsFormInitialized(true);
            }
        };
        
        loadExistingData();
    }, [currentElection, isFormInitialized]);

    useEffect(() => {
        setIsFormInitialized(false);
        setError('');
        setMessage('');
        setIsLoading(false);
    }, []);

    const validateForm = () => {
        if (!name || !cityArea || !startTime || !endTime) {
            throw new Error("All fields are required.");
        }

        const proposalNames = proposals.map(p => p.name.trim()).filter(p => p);
        if (proposalNames.length === 0) {
            throw new Error("Enter at least one proposal name.");
        }

        const proposalDescriptions = proposals.map(p => p.description.trim()).filter(desc => desc);
        if (proposalDescriptions.length !== proposalNames.length) {
            throw new Error("Proposals must have descriptions.");
        }

        const startTimeSeconds = Math.floor(new Date(startTime).getTime() / 1000);
        const endTimeSeconds = Math.floor(new Date(endTime).getTime() / 1000);

        if (isNaN(startTimeSeconds) || isNaN(endTimeSeconds)) {
            throw new Error("Invalid date format.");
        }

        if (startTimeSeconds >= endTimeSeconds) {
            throw new Error("Start time must be before end time.");
        }

        return { startTimeSeconds, endTimeSeconds };
    };

    const executeTransaction = async (operation: () => Promise<any>, successMessage: string) => {
        if (!isOwner || !account) {
            throw new Error("Action is owner only.");
        }

        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const txResponse = await operation();
            setMessage(`Transaction sent: ${txResponse.hash}. Waiting for confirmation...`);
            
            const receipt = await txResponse.wait();
            setMessage(`${successMessage} Tx: ${receipt.hash}`);
            
            return receipt;
        } catch (err: any) {
            console.error("Transaction error:", err);
            setError('Transaction failed.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const { startTimeSeconds, endTimeSeconds } = validateForm();
            
            if (!isOwner || !account) {
                throw new Error("Action is owner only.");
            }

            setMessage("Processing proposal metadata and updating election...");
            
            const proposalDataCIDs: string[] = [];
            const proposalImageCIDs: string[] = [];
            
            for (let i = 0; i < proposals.length; i++) {
                const proposal = proposals[i];
                const existingProposal = currentElection.proposals[i];
                const originalData = originalProposalData.get(i);
                
                try {
                    const nameChanged = originalData ? proposal.name.trim() !== originalData.name : true;
                    const descriptionChanged = originalData ? proposal.description.trim() !== originalData.description : proposal.description.trim() !== '';
                    const hasNewImage = proposal.imageFile !== undefined;
                    
                    if (nameChanged || descriptionChanged || hasNewImage) {
                        setMessage(`Uploading data for proposal ${i + 1}...`);
                        
                        const data = {
                            name: proposal.name.trim(),
                            description: proposal.description.trim(),
                            proposerAddress: account
                        };
                        
                        const dataCID = await ipfsService.uploadData(data);
                        
                        let imageCID = '';
                        if (proposal.imageFile) {
                            imageCID = await ipfsService.uploadImage(proposal.imageFile);
                        }
                        
                        proposalDataCIDs.push(dataCID);
                        proposalImageCIDs.push(imageCID);
                    } else if (existingProposal) {
                        proposalDataCIDs.push(existingProposal.dataCID || '');
                        proposalImageCIDs.push(existingProposal.imageCID || '');
                    } else {
                        proposalDataCIDs.push('');
                        proposalImageCIDs.push('');
                    }
                } catch (error: any) {
                    console.warn(`Failed to upload metadata for proposal ${i + 1}:`, error);
                    throw new Error(`Failed to upload metadata for proposal "${proposal.name}": ${error.message}`);
                }
            }

            setMessage("Requesting MetaMask signature to update election.");
            
            await executeTransaction(
                () => contractService.updateElection(
                    electionId,
                    name,
                    cityArea,
                    proposals.length,
                    proposalDataCIDs,
                    proposalImageCIDs,
                    startTimeSeconds,
                    endTimeSeconds
                ),
                "Election updated successfully."
            );
            
            if (onSuccess) {
                onSuccess();
            }
            setTimeout(onClose, 3000);
        } catch (err) {}
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete the election "${currentElection.name}"?`)) {
            return;
        }

        try {
            await executeTransaction(
                () => contractService.deleteElection(electionId),
                "Election deleted successfully."
            );
            
            if (onSuccess) {
                onSuccess();
            }
            setTimeout(onClose, 3000);
        } catch (err) {}
    };

    const isDisabled = isLoading || !isOwner;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    return (
        <div className="update-election-overlay" onClick={handleBackdropClick}>
            <div className="update-election-modal" onClick={(e) => e.stopPropagation()}>
                <div className="update-election-header">
                    <h3 className="update-election-title">Update Election (ID: {electionId})</h3>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="update-election-close-btn"
                    >
                        ×
                    </button>
                </div>
                
                {isLoadingExistingData ? (
                        <div className="update-election-loading">
                            <div>Loading existing election data...</div>
                        </div>
                    ) : (
                    <form onSubmit={handleSubmit}>
                        <FormField 
                            id="update-name"
                            label="Election Name"
                            value={name}
                            onChange={setName}
                        />
                        <FormField 
                            id="update-cityArea"
                            label="Street Address/Area"
                            value={cityArea}
                            onChange={setCityArea}
                        />
                        <div className="update-election-proposals-container">
                            <label className="update-election-proposals-label">
                                Proposals:
                            </label>
                            {proposals.map((proposal, index) => (
                                <div key={index} className="update-election-proposal-card">
                                    <div className="update-election-proposal-header">
                                        <h4 className="update-election-proposal-title">Proposal {index + 1}</h4>
                                        {proposals.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeProposal(index)}
                                                disabled={isDisabled}
                                                className="update-election-remove-btn"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="update-election-proposal-field">
                                        <label className="update-election-proposal-field-label">
                                            Name*:
                                        </label>
                                        <input 
                                            type="text" 
                                            value={proposal.name}
                                            onChange={e => updateProposal(index, 'name', e.target.value)}
                                            placeholder="Enter proposal name"
                                            required
                                            className="update-election-proposal-input"
                                        />
                                    </div>
                                    
                                    <div className="update-election-proposal-field">
                                        <label className="update-election-proposal-field-label">
                                            Description (required):
                                        </label>
                                        <textarea 
                                            value={proposal.description || ''}
                                            onChange={e => updateProposal(index, 'description', e.target.value)}
                                            placeholder="Enter proposal description"
                                            rows={3}
                                            required
                                            className="update-election-proposal-textarea"
                                        />
                                        {(() => {
                                            const originalData = originalProposalData.get(index);
                                            const currentDescription = proposal.description?.trim() || '';
                                            const originalDescription = originalData?.description || '';
                                            
                                            if (currentDescription === originalDescription && 
                                                currentElection.proposals[index]?.dataCID && 
                                                currentElection.proposals[index].dataCID.trim() !== '') {
                                                return;
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    
                                    <div className="update-election-proposal-field">
                                        <label className="update-election-proposal-field-label">
                                            Image:
                                        </label>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={e => updateProposal(index, 'imageFile', e.target.files?.[0])}
                                            className="update-election-proposal-file-input"
                                        />
                                        {proposal.imageFile && (
                                            <div className="update-election-image-selected">
                                                New image selected: {proposal.imageFile.name}
                                            </div>
                                        )}
                                        {!proposal.imageFile && currentElection.proposals[index]?.imageCID && currentElection.proposals[index].imageCID.trim() !== '' && (
                                            <div className="update-election-current-image">
                                                <img 
                                                    src={`https://${import.meta.env.VITE_APP_PINATA_GATEWAY || 'gold-leading-cat-504.mypinata.cloud'}/ipfs/${currentElection.proposals[index].imageCID}`}
                                                    alt={`Proposal ${index + 1} current image`}
                                                    className="update-election-proposal-image"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addProposal}
                                disabled={isDisabled}
                                className="update-election-add-btn"
                            >
                                Add Another Proposal
                            </button>
                        </div>
                        <FormField 
                            id="update-startTime"
                            label="Start Time"
                            type="datetime-local"
                            value={startTime}
                            onChange={setStartTime}
                        />
                        <FormField 
                            id="update-endTime"
                            label="End Time"
                            type="datetime-local"
                            value={endTime}
                            onChange={setEndTime}
                        />
                        
                        <div className="update-election-button-container">
                            <Button 
                                type="submit"
                                disabled={isDisabled}
                                className="update-election-btn-primary"
                            >
                                {isLoading ? 'Processing...' : 'Update Election'}
                            </Button>
                            <Button 
                                onClick={handleDelete}
                                disabled={isDisabled}
                                className="update-election-btn-danger"
                            >
                                {isLoading ? 'Processing...' : 'Delete Election'}
                            </Button>
                            <Button 
                                onClick={onClose}
                                disabled={isLoading}
                                className="update-election-btn-secondary"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
                
                {message && (
                    <div className="update-election-success-message">
                        {message}
                    </div>
                )}
                
                {error && (
                    <div className="update-election-error-message">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpdateElectionModal;
