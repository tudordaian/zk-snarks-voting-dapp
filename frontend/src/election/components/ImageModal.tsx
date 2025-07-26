import React from 'react';
import { ImageModalProps } from '../types';

const ImageModal: React.FC<ImageModalProps> = ({ show, selectedImage, onClose }) => {
    if (!show || !selectedImage) return null;

    return (
        <div className="image-modal-overlay" onClick={onClose}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                <button 
                    className="image-modal-close" 
                    onClick={onClose}
                >
                    ×
                </button>
                <img 
                    src={selectedImage.url} 
                    alt={selectedImage.name}
                    className="image-modal-image"
                />
                <div className="image-modal-info">
                    <h3>{selectedImage.name}</h3>
                    <div className="image-cid">
                        <strong>Image CID:</strong> {selectedImage.cid}
                        <button 
                            className="copy-cid-button"
                            onClick={() => {
                                navigator.clipboard.writeText(selectedImage.cid);
                            }}
                            title="Copy CID to clipboard"
                        >
                            📋
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
