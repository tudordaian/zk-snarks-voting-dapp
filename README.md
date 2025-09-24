# Zero-Knowledge Proofs Voting dApp

For my bachelor's thesis, I implemented the Semaphore protocol using smart contracts to leverage zero-knowledge proofs on a permissioned Besu blockchain. The dApp creates a unique Semaphore identity for each user when they log in with their ID and MetaMask digital wallet. The system cryptographically proves that a user is eligible to vote, has not previously voted in the election, and preserves vote integrity so that votes cannot be modified by malicious peers after being cast. The dApp also uses decentralized storage for election data via Pinata's IPFS API and includes a block-explorer component that calls the BlockScout API to ensure auditability and transparency.

## 🏗️ Architecture Overview

This project consists of four main components:

### 🔐 Smart Contracts (`CityProjectPoolLedger/`)
- **Semaphore Protocol Implementation**: Zero-knowledge proof voting system
- **ProjectPollLedger Contract**: Manages elections, proposals, and voting logic
- **Hardhat Development Environment**: For deployment and testing
- **Poseidon Hash Function**: Cryptographic primitives for ZK proofs

### 🎨 Frontend (`frontend/`)
- **React + Vite Application**: Modern web interface
- **MetaMask Integration**: Wallet connectivity and transaction signing
- **Semaphore Identity Management**: Deterministic identity generation
- **IPFS Integration**: Decentralized storage for election data
- **BlockScout Integration**: Blockchain explorer functionality

### 🔧 Backend (`backend/`)
- **NestJS API Server**: RESTful API services
- **Firebase Integration**: Additional data management
- **CORS Configuration**: Cross-origin resource sharing

### 🌐 Blockchain Network (`QBFT-Network/`)
- **Hyperledger Besu**: Permissioned blockchain network
- **QBFT Consensus**: Quantum Byzantine Fault Tolerance
- **Multi-Node Setup**: Distributed network configuration

## 🚀 Key Features

### Zero-Knowledge Proofs
- **Privacy-Preserving Voting**: Votes are cast anonymously using ZK-SNARKs
- **Eligibility Verification**: Cryptographic proof of voting rights without revealing identity
- **Double-Voting Prevention**: Nullifier system prevents duplicate votes
- **Vote Integrity**: Tamper-proof voting system using Merkle trees

### Blockchain Integration
- **Permissioned Network**: Controlled access using Hyperledger Besu
- **Smart Contract Automation**: Automated election management
- **Transparency**: All transactions are auditable on the blockchain
- **Decentralized Governance**: No single point of control

### User Experience
- **MetaMask Wallet**: Secure wallet integration for identity management
- **Intuitive Interface**: User-friendly voting experience
- **Real-time Updates**: Live election status and results
- **Mobile Responsive**: Works across different devices

### Data Management
- **IPFS Storage**: Decentralized storage via Pinata for election metadata
- **Immutable Records**: Permanent storage of election data
- **Efficient Retrieval**: Fast access to proposal information and results

## 🔧 Technology Stack

- **Smart Contracts**: Solidity, Hardhat, Semaphore Protocol
- **Frontend**: React, TypeScript, Vite, Ethers.js
- **Backend**: NestJS, Node.js, TypeScript
- **Blockchain**: Hyperledger Besu, QBFT consensus
- **Storage**: IPFS (Pinata), Firebase
- **Zero-Knowledge**: Semaphore, Poseidon hash, Circom circuits
- **Wallet**: MetaMask integration

## 📚 Getting Started

### Prerequisites
- Node.js (v22 LTS recommended)
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tudordaian/zk-snarks-voting-dapp.git
   cd zk-snarks-voting-dapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the blockchain network**
   ```bash
   cd QBFT-Network
   # Follow network setup instructions
   ```

4. **Deploy smart contracts**
   ```bash
   cd CityProjectPoolLedger
   npm install
   npx hardhat compile
   npx hardhat node
   # In another terminal:
   npx hardhat ignition deploy ./ignition/modules/ProjectPollLedger.ts --network localhost
   ```

5. **Start the backend**
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

6. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Configuration

Create `.env` files in the appropriate directories with:
- Blockchain network configuration
- IPFS/Pinata API keys
- Firebase configuration
- Frontend/backend URLs

## 🗳️ How It Works

### User Registration
1. User connects MetaMask wallet
2. System generates deterministic Semaphore identity
3. Identity commitment is added to the voting group
4. User can now participate in elections

### Voting Process
1. User selects an active election
2. Reviews proposals and makes a choice
3. System generates zero-knowledge proof of:
   - User eligibility (membership in voting group)
   - Vote uniqueness (no previous vote)
   - Vote validity (valid proposal selection)
4. Proof is submitted to smart contract
5. Vote is recorded without revealing voter identity

### Election Management
- Administrators can create elections
- Proposals are stored on IPFS
- Smart contracts manage election lifecycle
- Results are automatically calculated and published

## 🔍 Zero-Knowledge Proof Details

The system uses the Semaphore protocol which provides:

- **Identity Commitment**: Unique identifier without revealing private key
- **Group Membership**: Proof of eligibility without identity disclosure
- **Nullifier Hash**: Prevents double-voting while maintaining anonymity
- **Signal**: The actual vote choice, cryptographically linked to the proof

## 📖 Academic Context

This project was developed as part of a bachelor's thesis exploring the practical implementation of zero-knowledge proofs in decentralized voting systems. The work demonstrates how modern cryptographic techniques can solve traditional voting challenges including:

- Voter privacy and anonymity
- Election integrity and tamper-resistance  
- Verifiable vote counting
- Transparent yet private democratic processes

## 🤝 Contributing

This is an academic project, but contributions and feedback are welcome. Please feel free to:
- Report issues or bugs
- Suggest improvements
- Discuss the zero-knowledge implementation
- Share insights about decentralized voting

## 📄 License

This project is developed for educational and research purposes.

## 🔗 Additional Resources

- [Semaphore Protocol Documentation](https://semaphore.pse.dev/)
- [Hyperledger Besu](https://besu.hyperledger.org/)
- [Zero-Knowledge Proofs Explained](https://blog.ethereum.org/2016/12/05/zksnarks-in-a-nutshell)
- [IPFS Documentation](https://docs.ipfs.io/)

---

*This project demonstrates the practical application of zero-knowledge proofs in creating privacy-preserving, transparent, and secure digital voting systems.*