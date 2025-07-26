import React, { useState } from 'react';
import { useAuth } from '../../../identity/AuthContext';
import { contractService } from '../../../blockchain/services/contractService';
import { ipfsService } from '../../services/ipfsService';
import { ProposalFormData } from '../../types';

const CreateElectionForm: React.FC = () => {
    const [name, setName] = useState('');
    const [cityArea, setCityArea] = useState('');
    const [proposals, setProposals] = useState<ProposalFormData[]>([{ name: '', description: '' }]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { isOwner, account } = useAuth();

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

    const validateForm = () => {
        if (!name || !cityArea || !startTime || !endTime) {
            throw new Error("All fields are required.");
        }

        const proposalNames = proposals.map(p => p.name.trim()).filter(name => name);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const { startTimeSeconds, endTimeSeconds } = validateForm();

            if (!isOwner || !account) {
                throw new Error("Action is owner only.");
            }

            setMessage("Processing proposal data and creating election...");
            
            const proposalDataCIDs: string[] = [];
            const proposalImageCIDs: string[] = [];
            
            for (let i = 0; i < proposals.length; i++) {
                const proposal = proposals[i];
                
                try {
                    const proposalName = proposal.name.trim();
                    const proposalDescription = proposal.description.trim();
                    
                    if (proposalName && proposalDescription) {
                        setMessage(`Uploading data for proposal ${i + 1}...`);
                        
                        const data = {
                            name: proposalName,
                            description: proposalDescription,
                            proposerAddress: account
                        };
                        
                        const dataCID = await ipfsService.uploadData(data);
                        
                        let imageCID = '';
                        if (proposal.imageFile) {
                            imageCID = await ipfsService.uploadImage(proposal.imageFile);
                        }
                        
                        proposalDataCIDs.push(dataCID);
                        proposalImageCIDs.push(imageCID);
                    } else {
                        proposalDataCIDs.push('');
                        proposalImageCIDs.push('');
                    }
                } catch (error: any) {
                    console.warn(`Failed to upload data for proposal ${i + 1}:`, error);
                    
                    let errorMessage = `Failed to upload data for proposal "${proposal.name}": ${error.message}`;
                    
                    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
                        errorMessage = `Network timeout while uploading proposal "${proposal.name}". Please check your internet connection and try again.`;
                    } else if (error.message?.includes('fetch failed')) {
                        errorMessage = `Network error while uploading proposal "${proposal.name}". Please try again later.`;
                    }
                    
                    throw new Error(errorMessage);
                }
            }

            setMessage("Requesting MetaMask signature to create election.");
            const txResponse = await contractService.createElection(
                name,
                cityArea,
                proposals.length,
                proposalDataCIDs,
                proposalImageCIDs,
                startTimeSeconds,
                endTimeSeconds
            );

            if (!txResponse) {
                throw new Error("Failed to initiate transaction.");
            }

            setMessage(`Transaction sent: ${txResponse.hash}. Waiting for confirmation...`);
            const receipt = await txResponse.wait();
            setMessage(`Election created successfully. Tx: ${receipt?.hash}`);
            
            setName(''); 
            setCityArea(''); 
            setProposals([{ name: '', description: '' }]);
            setStartTime(''); 
            setEndTime('');
        } catch (err: any) {
            console.error("Create election error:", err);
            setError('Failed to create election.');
            setMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="create-election-form">
            <h3 className="create-election-title">Create New Election</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name" className="form-label">Election Name:</label>
                    <input 
                        type="text" 
                        id="name" 
                        className="form-input"
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="streetAddress" className="form-label">Street Address/Area:</label>
                    <input 
                        type="text" 
                        id="streetAddress" 
                        className="form-input"
                        value={cityArea} 
                        onChange={e => setCityArea(e.target.value)} 
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label">Proposals:</label>
                    {proposals.map((proposal, index) => (
                        <div key={index} className="proposal-card">
                            <div className="proposal-header">
                                <h4 className="proposal-title">Proposal {index + 1}</h4>
                                {proposals.length > 1 && (
                                    <button
                                        type="button"
                                        className="remove-proposal-btn"
                                        onClick={() => removeProposal(index)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor={`proposal-name-${index}`} className="form-label">Name (required):</label>
                                <input 
                                    type="text" 
                                    id={`proposal-name-${index}`}
                                    className="form-input"
                                    value={proposal.name}
                                    onChange={e => updateProposal(index, 'name', e.target.value)}
                                    placeholder={`Proposal ${index + 1} name`}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor={`proposal-description-${index}`} className="form-label">Description (required):</label>
                                <textarea 
                                    id={`proposal-description-${index}`}
                                    className="form-textarea"
                                    value={proposal.description || ''}
                                    onChange={e => updateProposal(index, 'description', e.target.value)}
                                    placeholder="Enter a detailed description for this proposal..."
                                    rows={3}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor={`proposal-image-${index}`} className="form-label">Image (optional):</label>
                                <input 
                                    type="file" 
                                    id={`proposal-image-${index}`}
                                    className="form-input"
                                    accept="image/*"
                                    onChange={e => updateProposal(index, 'imageFile', e.target.files?.[0])}
                                />
                                {proposal.imageFile && (
                                    <p className="file-selected">
                                        Selected: {proposal.imageFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="add-proposal-btn"
                        onClick={addProposal}
                    >
                        Add Proposal
                    </button>
                </div>
                
                <div className="form-group">
                    <label htmlFor="startTime" className="form-label">Start Time:</label>
                    <input 
                        type="datetime-local" 
                        id="startTime" 
                        className="form-input"
                        value={startTime} 
                        onChange={e => setStartTime(e.target.value)} 
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="endTime" className="form-label">End Time:</label>
                    <input 
                        type="datetime-local" 
                        id="endTime" 
                        className="form-input"
                        value={endTime} 
                        onChange={e => setEndTime(e.target.value)} 
                        required 
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading || !isOwner}
                >
                    {isLoading ? 'Processing...' : 'Create Election (Sign with MetaMask)'}
                </button>
            </form>
            
            {message && <div className="form-message success">{message}</div>}
            {error && <div className="form-message error">{error}</div>}
        </div>
    );
};

export default CreateElectionForm;