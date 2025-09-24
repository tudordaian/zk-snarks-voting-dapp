<h1>Governance Voting dApp using Smart Contracts and Zero Knowledge Proofs</h1>
For my bachelor's thesis, I implemented the Semaphore protocol using smart contracts to leverage zero-knowledge proofs on a permissioned Besu blockchain. The dApp creates a unique Semaphore identity for each user when they log in with their ID and MetaMask digital wallet. 

The system cryptographically proves that a user is eligible to vote, has not previously voted in the election, and preserves vote integrity so that votes cannot be modified by malicious peers after being cast. The dApp also uses decentralized storage for election data via Pinata's IPFS API and includes a block-explorer component that calls the BlockScout API to ensure auditability and transparency.
