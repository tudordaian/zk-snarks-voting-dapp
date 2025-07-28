import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('ProjectPollLedger', (m) => {

  const poseidonT3 = m.contract('PoseidonT3');

  const semaphoreVerifier = m.contract('SemaphoreVerifier');

  const semaphore = m.contract(
    'Semaphore',
    [semaphoreVerifier], 
    {
      libraries: {
        'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3,
      },
    }
  );

  const projectPollLedger = m.contract('ProjectPollLedger', [semaphore]);  

  return { poseidonT3, semaphoreVerifier, semaphore, projectPollLedger };
});