// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "hardhat/console.sol";

import "poseidon-solidity/PoseidonT3.sol";
import "@semaphore-protocol/contracts/base/SemaphoreVerifier.sol";
import "@semaphore-protocol/contracts/Semaphore.sol";

contract ProjectPollLedger {
    struct Proposal {
        uint voteCount;
        bool winningProposal;
        string dataCID;     // ipfs (name + description + proposer address)
        string imageCID;    // ipfs
    }

    struct Election {
        string name;
        string cityArea;
        uint startTime;
        uint endTime;
        bool active;
        bool finalized; // flag pentru a preveni autoapelarea repetata a functiei finalizeElection
        Proposal[] proposals;

        mapping(uint256 => bool) nullifiersUsed; 
    }

    struct ElectionView {
        uint256 electionId;
        string name;
        string cityArea;
        uint startTime;
        uint endTime;
        bool active;
        bool finalized;
    }

    struct PendingProposal {
        string dataCID;
        string imageCID;
        uint256 timestamp;
        bool processed;
    }

    struct PendingProposalView {
        uint256 proposalId;
        string dataCID;
        string imageCID;
        uint256 timestamp;
        bool processed;
    }

    address public owner;
    uint256 public electionCount = 0;
    mapping(uint256 => Election) public elections;
    
    mapping(uint256 => mapping(uint256 => PendingProposal)) public pendingProposals; // electionId => (proposalId => PendingProposal)[]
    mapping(uint256 => uint256) public pendingProposalCounts; // electionId => count
    
    ISemaphore public semaphore;
    uint256 public constant GROUP_ID = 0;  // merkle id 
    uint256 public constant MERKLE_TREE_DEPTH = 20; 

    event ElectionCreated(
        uint256 electionId,
        string name,
        uint startTime,
        uint endTime,
        uint proposalCount
    );
    event ElectionDeleted(uint256 electionId, string name);
    event VoteCasted(uint256 indexed electionId, uint proposalIndex, bytes32 signal, uint256 nullifierHash);
    event ProposalSubmitted(uint256 indexed electionId, uint256 proposalId);
    event ProposalAccepted(uint256 indexed electionId, uint256 proposalId);
    event ProposalDeclined(uint256 indexed electionId, uint256 proposalId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier electionExists(uint256 electionId) {
        require(electionId < electionCount, "Election does not exist.");
        _;
    }

    constructor(address semaphoreAddress) {
        owner = msg.sender;
        semaphore = ISemaphore(semaphoreAddress);
    }

    function setSemaphoreAddress(address newSemaphoreAddress) public onlyOwner {
        semaphore = ISemaphore(newSemaphoreAddress);
    }

    function createElection(
        string memory name,
        string memory cityArea,
        uint256 proposalCount,
        string[] memory proposalDataCIDs,
        string[] memory proposalImageCIDs,
        uint startTime,
        uint endTime
    ) public onlyOwner {
        require(startTime < endTime, "Invalid election duration");
        require(proposalDataCIDs.length == proposalCount, "Data CIDs count mismatch");
        require(proposalImageCIDs.length == proposalCount, "Image CIDs count mismatch");

        uint256 newElectionId = electionCount++;
        Election storage election = elections[newElectionId];
        election.name = name;
        election.cityArea = cityArea;
        election.active = false;
        election.finalized = false;
        election.startTime = startTime;
        election.endTime = endTime;

        for (uint i = 0; i < proposalCount; i++) {
            election.proposals.push(
                Proposal({
                    voteCount: 0,
                    winningProposal: false,
                    dataCID: proposalDataCIDs[i],
                    imageCID: proposalImageCIDs[i]
                })
            );
        }

        emit ElectionCreated(newElectionId, name, startTime, endTime, proposalCount);
    }

    function updateElection(
        uint256 electionId,
        string memory name,
        string memory cityArea,
        uint256 proposalCount,
        string[] memory proposalDataCIDs,
        string[] memory proposalIPFSCIDs,
        uint startTime,
        uint endTime
    ) public onlyOwner electionExists(electionId) {
        Election storage election = elections[electionId];
        
        require(!election.active, "Cannot update an active election");
        require(!election.finalized, "Cannot update a finalized election");
        require(startTime < endTime, "Invalid election duration");
        require(proposalDataCIDs.length == proposalCount, "Data CIDs count mismatch");
        require(proposalIPFSCIDs.length == proposalCount, "Image CIDs count mismatch");
        
        election.name = name;
        election.cityArea = cityArea;
        election.startTime = startTime;
        election.endTime = endTime;
        
        delete election.proposals;
        
        for (uint i = 0; i < proposalCount; i++) {
            election.proposals.push(
                Proposal({
                    voteCount: 0,
                    winningProposal: false,
                    dataCID: proposalDataCIDs[i],
                    imageCID: proposalIPFSCIDs[i]
                })
            );
        }

        emit ElectionCreated(electionId, name, startTime, endTime, proposalCount);
    }

    function deleteElection(uint256 electionId) public onlyOwner electionExists(electionId) {
        Election storage election = elections[electionId];
        
        require(!election.active, "Cannot delete an active election");
        require(!election.finalized, "Cannot delete a finalized election");
        
        string memory electionName = election.name;
        
        delete elections[electionId];
        
        emit ElectionDeleted(electionId, electionName);
    }

    // adaugarea unui identity commitment al unui votant in merkle tree
    function addMember(uint256 identityCommitment) public onlyOwner { 
        semaphore.addMember(GROUP_ID, identityCommitment);
        console.log("identityCommitment %s added to GROUP_ID %s", identityCommitment, GROUP_ID);
    }

    function vote(
        uint256 electionId,
        uint proposalIndex,
        uint256 merkleTreeRoot, // pt zkProof
        uint256 nullifierHash,  // pt zkProof
        uint256[8] memory zkProof   // format Groth16 [Ax, Ay, Bx1, Bx2, By1, By2 Cx, Cy] 
    ) public electionExists(electionId) {
        Election storage currentElection = elections[electionId];

        require(currentElection.active, "Election inactive");
        require(block.timestamp >= currentElection.startTime, "Election has not started.");
        require(block.timestamp <= currentElection.endTime, "Election has ended.");
        require(proposalIndex < currentElection.proposals.length, "Invalid proposal index.");
        require(!currentElection.nullifiersUsed[nullifierHash], "Nullifier was already used for this election.");

        // message(sau signal) -> alegerea votantului; externalNullifier -> id-ul alegerii
        bytes32 message = keccak256(abi.encode(proposalIndex));   // trebuie hash pt a fi 32 bytes
        uint256 externalNullifier = electionId;

        // contruirea proof-ului 
        ISemaphore.SemaphoreProof memory proofData = ISemaphore.SemaphoreProof({
            merkleTreeDepth: MERKLE_TREE_DEPTH,
            merkleTreeRoot: merkleTreeRoot,
            nullifier: nullifierHash,
            message: uint256(message), 
            scope: externalNullifier,
            points: zkProof // uint256[8] --> 8 valori int ce reprezinta proof-ul criptografic
        });

        bool isValidProof = semaphore.verifyProof(GROUP_ID, proofData);
        require(isValidProof, "Invalid proof");     // pica daca votul e modificat

        currentElection.proposals[proposalIndex].voteCount += 1;
        currentElection.nullifiersUsed[nullifierHash] = true;

        emit VoteCasted(electionId, proposalIndex, message, nullifierHash);
    }

    function startElection(uint256 electionId) public onlyOwner electionExists(electionId) {
        require(!elections[electionId].active, "Election already active.");
        require(block.timestamp >= elections[electionId].startTime, "Election start time has not reached.");
        require(block.timestamp < elections[electionId].endTime, "Election end time has passed.");
        elections[electionId].active = true;
    }

    // finalizare automata (din backend) a unui election
    function finalizeElection(uint256 electionId) public onlyOwner electionExists(electionId) {
        Election storage election = elections[electionId];
        
        require(!election.finalized, "Election is already finalized");

        if (election.active && block.timestamp >= election.endTime) {
            election.active = false;
            election.finalized = true;
            _setWinningProposal(electionId);
        } else {
            require(block.timestamp >= election.endTime, "Election has not ended yet");
            election.active = false;
            election.finalized = true;
            _setWinningProposal(electionId);
        }
    }

    // finalizare fortata a unui election
    function endElection(uint256 electionId) public onlyOwner electionExists(electionId) {
        require(elections[electionId].active, "Election is not active.");
        elections[electionId].active = false;
        elections[electionId].finalized = true;
        _setWinningProposal(electionId);
    }

    function _setWinningProposal(uint256 electionId) internal {
        uint winningProposal = getWinningProposal(electionId);

        Election storage election = elections[electionId];
        for (uint i = 0; i < election.proposals.length; i++) {
            election.proposals[i].winningProposal = false;
        }

        elections[electionId]
            .proposals[winningProposal]
            .winningProposal = true;
    }

    function hasElectionEnded(uint256 electionId) public view returns (bool) {
        Election storage election = elections[electionId];
        return election.active && block.timestamp >= election.endTime && !election.finalized;
    }

    function shouldElectionStart(uint256 electionId) public view returns (bool) {
        Election storage election = elections[electionId];
        return !election.active && !election.finalized && 
               block.timestamp >= election.startTime && block.timestamp < election.endTime;
    }

    function getCurrentBlockTimestamp() public view returns (uint256) {
        return block.timestamp;
    }

    function getAllElections() public view returns (ElectionView[] memory) {
        uint256 activeElectionCount = 0;
        for (uint256 i = 0; i < electionCount; i++) {
            if (bytes(elections[i].name).length > 0) {
                activeElectionCount++;
            }
        }
        ElectionView[] memory allElections = new ElectionView[](activeElectionCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < electionCount; i++) {
            Election storage election = elections[i];
            
            if (bytes(election.name).length > 0) {
                allElections[currentIndex] = ElectionView({
                    electionId: i,
                    name: election.name,
                    cityArea: election.cityArea,
                    active: election.active,
                    finalized: election.finalized,
                    startTime: election.startTime,
                    endTime: election.endTime
                });
                currentIndex++;
            }
        }

        return allElections;
    }

    function getElection(uint256 electionId) public view returns (ElectionView memory) {
        require(electionId < electionCount, "Election does not exist.");
        Election storage election = elections[electionId];

        return ElectionView({
            electionId: electionId,
            name: election.name,
            cityArea: election.cityArea,
            active: election.active,
            finalized: election.finalized,
            startTime: election.startTime,
            endTime: election.endTime
        });
    }

    function getProposals(
        uint256 electionId
    ) public view electionExists(electionId) returns (Proposal[] memory) {
        Election storage election = elections[electionId];
        Proposal[] memory proposals = new Proposal[](election.proposals.length);

        for (uint256 i = 0; i < election.proposals.length; i++) {
            proposals[i] = election.proposals[i];
        }

        return proposals;
    }

    function checkVotes(
        uint256 electionId
    ) public view electionExists(electionId) returns (uint256[] memory) {
        Election storage election = elections[electionId];
        uint256[] memory voteCounts = new uint256[](election.proposals.length);

        for (uint256 i = 0; i < election.proposals.length; i++) {
            voteCounts[i] = election.proposals[i].voteCount;
        }

        return voteCounts;
    }

    function getWinnerDataCID(
        uint256 electionId
    ) external view electionExists(electionId) returns (string memory winnerDataCID) {
        winnerDataCID = elections[electionId]
            .proposals[getWinningProposal(electionId)]
            .dataCID;
    }

    function getWinningProposal(
        uint256 electionId
    ) public view electionExists(electionId) returns (uint winningProposal_) {
        Election storage election = elections[electionId];
        uint winningVoteCount = 0;

        for (uint p = 0; p < election.proposals.length; p++) {
            if (election.proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = election.proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    function submitProposal(
        uint256 electionId,
        string memory dataCID,
        string memory imageCID
    ) public electionExists(electionId) {
        Election storage election = elections[electionId];
        
        require(!election.active, "Cannot submit proposals to an active election");
        require(!election.finalized, "Cannot submit proposals to a finalized election");
        require(block.timestamp < election.startTime, "Cannot submit proposals after election start time");
        require(bytes(dataCID).length > 0, "Proposal data CID cannot be empty");

        uint256 proposalId = pendingProposalCounts[electionId]++;
        
        pendingProposals[electionId][proposalId] = PendingProposal({
            dataCID: dataCID,
            imageCID: imageCID,
            timestamp: block.timestamp,
            processed: false
        });

        emit ProposalSubmitted(electionId, proposalId);
    }

    function acceptProposal(
        uint256 electionId,
        uint256 proposalId
    ) public onlyOwner electionExists(electionId) {
        PendingProposal storage proposal = pendingProposals[electionId][proposalId];
        Election storage election = elections[electionId];
        
        require(!proposal.processed, "Proposal already processed");
        require(!election.active, "Cannot accept proposals for an active election");
        require(!election.finalized, "Cannot accept proposals for a finalized election");

        proposal.processed = true;

        election.proposals.push(
            Proposal({
                voteCount: 0,
                winningProposal: false,
                dataCID: proposal.dataCID,
                imageCID: proposal.imageCID
            })
        );

        emit ProposalAccepted(electionId, proposalId);
    }

    function declineProposal(
        uint256 electionId,
        uint256 proposalId
    ) public onlyOwner electionExists(electionId) {
        PendingProposal storage proposal = pendingProposals[electionId][proposalId];
        require(!proposal.processed, "Proposal already processed");
        proposal.processed = true;

        emit ProposalDeclined(electionId, proposalId);
    }

    function getPendingProposals(
        uint256 electionId
    ) public view electionExists(electionId) returns (PendingProposalView[] memory) {
        uint256 totalProposals = pendingProposalCounts[electionId];
        uint256 unprocessedCount = 0;

        for (uint256 i = 0; i < totalProposals; i++) {
            if (!pendingProposals[electionId][i].processed) {
                unprocessedCount++;
            }
        }

        PendingProposalView[] memory unprocessedProposals = new PendingProposalView[](unprocessedCount);
        uint256 index = 0;

        for (uint256 i = 0; i < totalProposals; i++) {
            if (!pendingProposals[electionId][i].processed) {
                unprocessedProposals[index] = PendingProposalView({
                    proposalId: i,
                    dataCID: pendingProposals[electionId][i].dataCID,
                    imageCID: pendingProposals[electionId][i].imageCID,
                    timestamp: pendingProposals[electionId][i].timestamp,
                    processed: pendingProposals[electionId][i].processed
                });
                index++;
            }
        }

        return unprocessedProposals;
    }

    function getPendingProposalCount(
        uint256 electionId
    ) public view electionExists(electionId) returns (uint256) {
        uint256 totalProposals = pendingProposalCounts[electionId];
        uint256 unprocessedCount = 0;

        for (uint256 i = 0; i < totalProposals; i++) {
            if (!pendingProposals[electionId][i].processed) {
                unprocessedCount++;
            }
        }

        return unprocessedCount;
    }
}
