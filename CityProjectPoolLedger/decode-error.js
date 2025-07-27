const { ethers } = require('ethers');

// Calculate function selector hashes for Semaphore errors
const errors = [
    'Semaphore__YouAreUsingTheSameNullifierTwice()',
    'Semaphore__InvalidProof()',
    'Semaphore__MerkleTreeRootIsNotPartOfTheGroup()',
    'Semaphore__MerkleTreeRootIsExpired()',
    'Semaphore__MerkleTreeDepthIsNotSupported()',
    'Semaphore__GroupHasNoMembers()'
];

console.log('Error selectors:');
errors.forEach(error => {
    const selector = ethers.id(error).slice(0, 10);
    console.log(`${error}: ${selector}`);
});

console.log('\nReceived error data: 0x208b15e8');

// Check if it matches any of our errors
const receivedError = '0x208b15e8';
errors.forEach(error => {
    const selector = ethers.id(error).slice(0, 10);
    if (selector === receivedError) {
        console.log(`MATCH FOUND: ${error}`);
    }
});
